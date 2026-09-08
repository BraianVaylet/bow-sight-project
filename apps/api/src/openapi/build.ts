import { z } from 'zod';
import { CATALOG, type RouteDoc } from './catalog.js';

/** Una ruta montada, tal cual la reporta Hono. */
export interface MountedRoute {
  method: string;
  path: string;
}

/**
 * Rutas que existen pero no son parte del contrato publico: el comodin de los
 * middlewares y la raiz. No se documentan porque no se llaman.
 */
const NO_DOCUMENTADAS = [/^\/\*$/, /^\/$/];

export class RutaSinDocumentarError extends Error {
  constructor(readonly rutas: string[]) {
    super(
      `Hay rutas montadas sin entrada en el catalogo de OpenAPI: ${rutas.join(' · ')}. ` +
        'Agregalas en apps/api/src/openapi/catalog.ts. La documentacion sale del registro de ' +
        'rutas a proposito: es lo unico que impide que quede desactualizada.',
    );
    this.name = 'RutaSinDocumentarError';
  }
}

/** Las rutas que hay que documentar, sin duplicados y en orden estable. */
export function rutasDocumentables(routes: MountedRoute[]): string[] {
  const claves = routes
    .filter((r) => r.method !== 'ALL')
    .filter((r) => !NO_DOCUMENTADAS.some((re) => re.test(r.path)))
    .map((r) => `${r.method} ${r.path}`);

  return [...new Set(claves)].sort();
}

/** `/api/v1/sights/:id` → `/api/v1/sights/{id}`, que es como lo escribe OpenAPI. */
function aPlantillaOpenApi(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function parametrosDeRuta(path: string): { name: string; in: 'path' }[] {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((m) => ({ name: m[1]!, in: 'path' as const }));
}

/**
 * `z.toJSONSchema` no sabe traducir un `superRefine`: son reglas que cruzan dos
 * campos y no tienen expresion en JSON Schema. En vez de fallar, se documenta lo
 * que si se puede y la regla cruzada vive en la `description` de la operacion.
 */
function jsonSchemaDe(schema: z.ZodType): Record<string, unknown> | undefined {
  try {
    return z.toJSONSchema(schema, { io: 'input', unrepresentable: 'any' }) as Record<
      string,
      unknown
    >;
  } catch {
    return undefined;
  }
}

function operacion(clave: string, doc: RouteDoc, path: string): Record<string, unknown> {
  const status = doc.status ?? 200;

  const respuestas: Record<string, unknown> = {
    [String(status)]: { description: doc.summary },
  };

  if (!doc.publica) {
    respuestas['401'] = {
      description: 'Sin sesion',
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    };
  }

  for (const code of doc.errors ?? []) {
    const http = code.split('-')[2] ?? '400';
    respuestas[http] = {
      // Varios codigos pueden compartir el HTTP: se listan todos en la misma.
      description: [(respuestas[http] as { description?: string } | undefined)?.description, code]
        .filter(Boolean)
        .join(' · '),
      content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
    };
  }

  const op: Record<string, unknown> = {
    operationId: clave
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, ''),
    summary: doc.summary,
    tags: [doc.tag],
    responses: respuestas,
  };

  if (doc.description) op['description'] = doc.description;
  if (!doc.publica) op['security'] = [{ cookieAuth: [] }];

  const params: Record<string, unknown>[] = parametrosDeRuta(path).map((p) => ({
    ...p,
    required: true,
    schema: { type: 'string', format: 'uuid' },
  }));

  if (doc.query) {
    const js = jsonSchemaDe(doc.query);
    const props = (js?.['properties'] ?? {}) as Record<string, unknown>;
    const requeridos = new Set((js?.['required'] ?? []) as string[]);
    for (const [name, schema] of Object.entries(props)) {
      params.push({ name, in: 'query', required: requeridos.has(name), schema });
    }
  }

  if (params.length > 0) op['parameters'] = params;

  if (doc.body) {
    const schema = jsonSchemaDe(doc.body);
    op['requestBody'] = {
      required: true,
      content: { 'application/json': { schema: schema ?? { type: 'object' } } },
    };
  }

  return op;
}

/**
 * El documento OpenAPI, armado desde **las rutas montadas de verdad**.
 *
 * 🔴 Lanza si alguna no esta en el catalogo. Es deliberado: una documentacion
 * que se escribe aparte se desactualiza el dia que alguien agrega un endpoint
 * con apuro, y nadie se entera hasta que un integrador se queja.
 */
export function buildOpenApi(routes: MountedRoute[], version = '0.1.0'): Record<string, unknown> {
  const claves = rutasDocumentables(routes);
  const faltantes = claves.filter((c) => !(c in CATALOG));
  if (faltantes.length > 0) throw new RutaSinDocumentarError(faltantes);

  const paths: Record<string, Record<string, unknown>> = {};
  for (const clave of claves) {
    const [method, path] = clave.split(' ') as [string, string];
    const plantilla = aPlantillaOpenApi(path);
    paths[plantilla] ??= {};
    paths[plantilla][method.toLowerCase()] = operacion(clave, CATALOG[clave]!, path);
  }

  return {
    openapi: '3.1.0',
    info: {
      title: 'Bow Sight API',
      version,
      description:
        'Las marcas de mira de un arquero.\n\n' +
        '🔴 **El `userId` sale de la sesion, nunca del pedido.** Ninguna ruta lo acepta en el ' +
        'cuerpo ni en la query, y pedir algo ajeno responde **404, no 403**: un 403 confirmaria ' +
        'que ese recurso existe.\n\n' +
        '🔴 **Los errores traen claves, nunca prosa.** El idioma lo resuelve el cliente; el ' +
        'diccionario completo esta en `docs/errors.md`.\n\n' +
        '🔴 **Unidades canonicas:** distancias en **metros**, escala de mira en **milimetros**. ' +
        'La conversion a yardas, centimetros, pulgadas o clicks ocurre solo en el borde de ' +
        'presentacion; nunca se guarda ni se envia un valor ya convertido.',
    },
    servers: [{ url: '/', description: 'El mismo origen' }],
    paths,
    components: {
      securitySchemes: {
        cookieAuth: { type: 'apiKey', in: 'cookie', name: 'bs.session_token' },
      },
      schemas: {
        Error: {
          type: 'object',
          required: ['success', 'error'],
          properties: {
            success: { type: 'boolean', enum: [false] },
            error: {
              type: 'object',
              required: ['code', 'messageKey', 'requestId', 'timestamp'],
              properties: {
                code: {
                  type: 'string',
                  pattern: '^BS-[A-Z]{3,5}-[0-9]{3}-[0-9]{3}$',
                  examples: ['BS-SIGHT-404-001'],
                },
                messageKey: {
                  type: 'string',
                  description: 'La clave a traducir. **Nunca texto para mostrar.**',
                  examples: ['errors.sight.notFound'],
                },
                params: {
                  type: 'object',
                  description: 'Valores a interpolar en el mensaje traducido.',
                  additionalProperties: true,
                },
                requestId: { type: 'string' },
                timestamp: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'salud', description: 'Healthchecks. Fuera de `/api/v1`: no versionan.' },
      { name: 'auth', description: 'Cuenta y sesion.' },
      { name: 'equipo', description: 'Arcos y sets de flechas.' },
      { name: 'miras', description: 'Las miras del arquero y su escala.' },
      { name: 'marcas', description: 'Las marcas medidas y el calculo.' },
    ],
  };
}
