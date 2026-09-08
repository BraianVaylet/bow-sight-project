import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CATALOG } from '../src/openapi/catalog.js';
import { buildOpenApi, rutasDocumentables, RutaSinDocumentarError } from '../src/openapi/build.js';
import { startAuthHarness, type AuthHarness } from './authHarness.js';

/**
 * La documentacion sale del **registro de rutas montadas**, no de un archivo
 * escrito aparte. Estos tests son lo que hace que esa promesa sea cierta.
 */
//
// 🔴 Se levanta la app **completa**, con auth y modulos, y no la liviana de
// `makeApp()`. La liviana monta solo los healthchecks: contra ella estos tests
// pasarian sin haber mirado una sola ruta de negocio, que es justamente lo que
// tienen que verificar.
let h: AuthHarness;

beforeAll(async () => {
  h = await startAuthHarness();
}, 180_000);

afterAll(async () => {
  await h?.stop();
});

/** Ruta montada, con la forma que reporta Hono. */
type Ruta = { method: string; path: string };
const rutas = (): Ruta[] => h.app.routes.map((r) => ({ method: r.method, path: r.path }));

describe('el catalogo cubre lo que existe', () => {
  it('🔴 toda ruta montada esta documentada', () => {
    // El gemelo del fixture de ataque: agregar un endpoint y olvidarse de
    // documentarlo rompe el CI, en vez de salir a produccion sin contrato.
    const sinDocumentar = rutasDocumentables(rutas()).filter((c) => !(c in CATALOG));

    expect(sinDocumentar, `rutas sin entrada en el catalogo: ${sinDocumentar.join(' · ')}`).toEqual(
      [],
    );
  });

  it('🔴 y no sobra: el catalogo no documenta rutas que no existen', () => {
    // Documentar un endpoint que se borro es peor que no documentarlo: manda a
    // un integrador a escribir codigo contra algo que responde 404.
    const montadas = new Set(rutasDocumentables(rutas()));
    const fantasmas = Object.keys(CATALOG).filter((c) => !montadas.has(c));

    expect(fantasmas, `documentadas pero no montadas: ${fantasmas.join(' · ')}`).toEqual([]);
  });

  it('una ruta montada sin entrada hace fallar el build, no lo saltea', () => {
    expect(() => buildOpenApi([...rutas(), { method: 'GET', path: '/api/v1/inventada' }])).toThrow(
      RutaSinDocumentarError,
    );
  });

  it('no es vacuo: hay rutas de verdad para documentar', () => {
    // Si el registro viniera vacio, los dos tests de arriba pasarian siempre.
    expect(rutasDocumentables(rutas()).length).toBeGreaterThan(20);
  });
});

describe('los codigos de error citados existen', () => {
  it('🔴 todo codigo del catalogo esta declarado en docs/errors.md', () => {
    // Declarar el codigo en el diccionario es Definition of Ready. Si el
    // contrato cita uno que no esta ahi, alguien se lo salteo.
    const doc = readFileSync(resolve(process.cwd(), '../../docs/errors.md'), 'utf8');
    const declarados = new Set(
      [...doc.matchAll(/`(BS-[A-Z]{3,5}-\d{3}-\d{3})`/g)].map((m) => m[1]),
    );

    expect(declarados.size).toBeGreaterThan(20);

    const citados = [...new Set(Object.values(CATALOG).flatMap((d) => d.errors ?? []))];
    const huerfanos = citados.filter((c) => !declarados.has(c)).sort();

    expect(huerfanos, `codigos citados y no declarados: ${huerfanos.join(' · ')}`).toEqual([]);
  });
});

interface Documento {
  openapi: string;
  paths: Record<string, Record<string, { responses: Record<string, unknown>; security?: unknown }>>;
  components: { schemas: Record<string, unknown> };
}

describe('el documento', () => {
  // Dentro de cada test y no a nivel de modulo: el harness todavia no arranco
  // cuando se evalua el archivo.
  const doc = (): Documento => buildOpenApi(rutas()) as unknown as Documento;

  it('es OpenAPI 3.1 con sus rutas', () => {
    expect(doc().openapi).toBe('3.1.0');
    expect(Object.keys(doc().paths).length).toBeGreaterThan(10);
  });

  it('🔴 traduce los parametros de Hono a los de OpenAPI', () => {
    // `/sights/:id` no significa nada para un cliente de OpenAPI.
    expect(doc().paths['/api/v1/sights/{id}']).toBeDefined();
    expect(doc().paths['/api/v1/sights/:id']).toBeUndefined();
  });

  it('el cuerpo sale del schema de Zod, no de una copia escrita a mano', () => {
    const post = doc().paths['/api/v1/sights']?.['post'] as {
      requestBody?: { content: { 'application/json': { schema: Record<string, unknown> } } };
    };
    const schema = post?.requestBody?.content['application/json']?.schema;
    const props = schema?.['properties'] as Record<string, unknown> | undefined;

    // Los milimetros son el canonico: si el contrato dijera otra cosa, el
    // integrador mandaria centimetros y nadie se enteraria hasta ver la regla.
    expect(props).toHaveProperty('scaleMinMm');
    expect(props).toHaveProperty('scaleMaxMm');
    expect(props).toHaveProperty('scaleUnit');
  });

  it('la calculadora declara sus parametros de query', () => {
    const get = doc().paths['/api/v1/sights/{sightId}/marks/calculate']?.['get'] as {
      parameters?: { name: string; in: string; required?: boolean }[];
    };
    const query = (get?.parameters ?? []).filter((p) => p.in === 'query');

    expect(query.map((p) => p.name).sort()).toEqual(['angleDeg', 'arrowSetId', 'distanceM']);
    expect(query.find((p) => p.name === 'angleDeg')?.required).toBe(false);
  });

  it('🔴 toda ruta privada declara 401 y su esquema de sesion', () => {
    const privadas = Object.entries(CATALOG).filter(([, d]) => !d.publica);
    expect(privadas.length).toBeGreaterThan(10);

    for (const [clave] of privadas) {
      const [method, path] = clave.split(' ') as [string, string];
      const op = doc().paths[path.replace(/:([A-Za-z0-9_]+)/g, '{$1}')]?.[method.toLowerCase()];

      expect(op?.security, `${clave} sin security`).toBeDefined();
      expect(op?.responses['401'], `${clave} sin 401`).toBeDefined();
    }
  });

  it('🔴 el envelope de error documenta claves, no prosa', () => {
    const error = doc().components.schemas['Error'] as {
      properties: { error: { properties: Record<string, unknown> } };
    };
    const props = error.properties.error.properties;

    expect(props).toHaveProperty('messageKey');
    expect(props).toHaveProperty('params');
    // `message` seria texto para mostrar, que es exactamente lo que la API no
    // manda: el idioma lo resuelve el cliente (ADR-005).
    expect(props).not.toHaveProperty('message');
  });
});

describe('servido por HTTP', () => {
  it('GET /api/v1/docs devuelve el contrato, sin sesion', async () => {
    const res = await h.app.request('/api/v1/docs');
    expect(res.status).toBe(200);

    const body = (await res.json()) as { openapi: string; info: { title: string } };
    expect(body.openapi).toBe('3.1.0');
    expect(body.info.title).toBe('Bow Sight API');
  });
});
