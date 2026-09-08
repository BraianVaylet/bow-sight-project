import { Hono } from 'hono';
import { buildOpenApi, type MountedRoute } from '../openapi/build.js';
import type { AppEnv } from '../types.js';

/**
 * `/api/v1/docs` — el contrato de la API, generado.
 *
 * 🔴 **Se registra antes que la zona protegida y se arma despues.** Las dos
 * mitades tienen su motivo:
 *
 * - *Antes*, porque la zona protegida instala un `use('*')` sobre `/api/v1/*`.
 *   Registrado despues, el contrato responderia 401 — y un contrato que hay que
 *   loguearse para leer no es un contrato.
 * - *Despues*, porque el documento sale de `app.routes`, y en el momento de
 *   registrarlo todavia no estan montadas las rutas de negocio. Se arma en el
 *   primer pedido y queda cacheado.
 *
 * Para que "despues" no signifique "cuando alguien se queje", `createApp` llama
 * a `assertDocumentado` al terminar de montar: si falta una ruta en el catalogo,
 * el proceso no levanta.
 *
 * 🔴 Y por eso recibe una **foto** de las rutas, tomada al final de `createApp`,
 * en vez de leer `app.routes` cuando llega el pedido. El contrato describe la
 * app que `createApp` armo, no lo que alguien le atornille despues: el arnes de
 * E2E, por ejemplo, le agrega un buzon de mails que no es parte del producto.
 *
 * 🔴 **Se sirve el JSON y nada mas: no hay pagina con un visor.** Un visor de
 * OpenAPI se monta cargando un script de un CDN, y ese script correria en el
 * **mismo origen que la cookie de sesion**. Quien controle ese CDN tendria
 * ejecucion de codigo justo donde vive `bs.session_token`. El JSON lo abre
 * cualquier cliente de OpenAPI desde afuera, sin pedirnos esa superficie.
 */
export function createDocsRoutes(contrato: () => MountedRoute[]) {
  let documento: Record<string, unknown> | undefined;

  return new Hono<AppEnv>().get('/docs', (c) => {
    documento ??= buildOpenApi(contrato());
    return c.json(documento);
  });
}

/**
 * Falla si alguna ruta montada no esta documentada.
 *
 * Se llama al final de `createApp`: la documentacion desactualizada tiene que
 * romper el arranque y el CI, no aparecer como un hueco que alguien descubre
 * integrando.
 */
export function assertDocumentado(routes: MountedRoute[]): void {
  buildOpenApi(routes);
}
