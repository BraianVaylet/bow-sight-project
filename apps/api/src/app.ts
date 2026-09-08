import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { createErrorHandler, createNotFoundHandler } from './http/errorHandler.js';
import { requestId } from './http/requestId.js';
import { securityHeaders } from './http/security.js';
import { requireAuth } from './auth/middleware.js';
import { createAuthRoutes } from './auth/routes.js';
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
  if (deps.auth) v1.route('/auth', createAuthRoutes({ auth: deps.auth, pwaUrl: deps.env.PWA_URL }));

  // 🔴 Todo lo que sigue exige sesion. El `userId` sale de `requireAuth` y de
  // ningun otro lado: ninguna ruta lo acepta del pedido (ADR-000).
  if (deps.auth && deps.modules) {
    const protegido = new Hono<AppEnv>();
    protegido.use('*', requireAuth(deps.auth));
    protegido.route('/', deps.modules.routes);
    v1.route('/', protegido);
  }

  app.route('/api/v1', v1);

  return app;
}

export type App = ReturnType<typeof createApp>;
