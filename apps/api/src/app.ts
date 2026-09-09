import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createErrorHandler, createNotFoundHandler } from './http/errorHandler.js';
import { unavailableError } from './http/errors.js';
import { requestId } from './http/requestId.js';
import { securityHeaders } from './http/security.js';
import { requireAuth } from './auth/middleware.js';
import { createAuthRoutes } from './auth/routes.js';
import type { MountedRoute } from './openapi/build.js';
import { assertDocumentado, createDocsRoutes } from './routes/docs.js';
import { createHealthRoutes } from './routes/health.js';
import type { AppDeps, AppEnv } from './types.js';

/**
 * Arma la app. Recibe sus dependencias en vez de construirlas: es lo que
 * permite probarla sin levantar Mongo ni leer el entorno.
 *
 * 🔴 Los webhooks de cobro (F2) se montaran **fuera de `/api/v1` y fuera del
 * limitador por IP**: Stripe reintenta desde IPs rotativas y un 429 hace que
 * marque el endpoint como caido (ADR-003).
 */
export function createApp(deps: AppDeps) {
  const app = new Hono<AppEnv>();

  app.onError(createErrorHandler(deps));
  app.notFound(createNotFoundHandler(deps));

  app.use('*', requestId);
  app.use('*', async (c, next) => {
    // Un logger hijo por pedido: asi el `requestId` viaja solo en cada linea y
    // nadie tiene que acordarse de pasarlo.
    c.set('logger', deps.logger.child({ requestId: c.get('requestId') }));
    await next();
  });
  app.use('*', securityHeaders);

  if (deps.env.CORS_ORIGINS.length > 0) {
    // Origenes explicitos, nunca comodin: la API responde con credenciales.
    app.use('/api/*', cors({ origin: deps.env.CORS_ORIGINS, credentials: true, maxAge: 600 }));
  }

  app.route('/', createHealthRoutes(deps));

  // El contrato del producto vive bajo `/api/v1`. Los modulos se montan aca a
  // medida que existen (F0-15).
  const v1 = new Hono<AppEnv>();

  // 🔴 El contrato va **antes** de la zona protegida: esa instala un `use('*')`
  // sobre `/api/v1/*`, y registrado despues el contrato responderia 401. El
  // documento se arma en el primer pedido, sobre la foto que se toma abajo.
  let contrato: MountedRoute[] = [];
  v1.route(
    '/',
    createDocsRoutes(() => contrato),
  );
  if (deps.auth) v1.route('/auth', createAuthRoutes({ auth: deps.auth, pwaUrl: deps.env.PWA_URL }));

  // 🔴 Todo lo que sigue exige sesion. El `userId` sale de `requireAuth` y de
  // ningun otro lado: ninguna ruta lo acepta del pedido (ADR-000).
  if (deps.auth && deps.modules) {
    const protegido = new Hono<AppEnv>();
    protegido.use('*', requireAuth(deps.auth));
    protegido.route('/', deps.modules.routes);
    v1.route('/', protegido);
  }

  /**
   * 🔴 Sin base, el contrato del producto responde **503, no 404**.
   *
   * Sin Mongo no se montan `auth` ni los modulos, asi que todo `/api/v1/*` caia
   * en el "no encontrado" generico. Y ese 404 miente sobre la causa: manda a
   * buscar una ruta que falta cuando lo que falta es la configuracion. Alguien
   * probando la app en local ve "no pudimos verificar tu sesion" y no tiene como
   * saber que le falta levantar la base.
   *
   * Va **despues** del contrato —que si funciona sin base— y como `all`, asi que
   * no entra ni en el registro de rutas ni en el OpenAPI.
   */
  if (!deps.auth || !deps.modules) {
    v1.all('*', () => {
      throw unavailableError();
    });
  }

  app.route('/api/v1', v1);

  // La foto de lo que quedo montado. Se toma aca y no en el pedido: lo que se
  // agregue despues de `createApp` no es parte del contrato del producto.
  contrato = app.routes.map((r) => ({ method: r.method, path: r.path }));

  // 🔴 Que falte una ruta en el catalogo tiene que romper el **arranque**, no
  // aparecer como un hueco que alguien descubre integrando.
  assertDocumentado(contrato);

  return app;
}

export type App = ReturnType<typeof createApp>;
