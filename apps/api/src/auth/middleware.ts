import { createMiddleware } from 'hono/factory';
import { AppError } from '../http/errors.js';
import type { AppEnv } from '../types.js';
import type { Auth } from './auth.js';
import { AUTH_ERRORS } from './errors.js';

/**
 * Resuelve la sesion y deja el `userId` en el contexto.
 *
 * 🔴 **Es el unico lugar del que sale el `userId`.** Ninguna ruta lo acepta del
 * body, de la query ni de un parametro: si el cliente pudiera elegirlo, el
 * aislamiento seria una sugerencia (ADR-000).
 */
export function requireAuth(auth: Auth) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) throw new AppError(AUTH_ERRORS.sessionExpired);

    const user = session.user as Record<string, unknown>;
    c.set('userId', String(user['id']));
    c.set('locale', (user['locale'] as 'es' | 'en') ?? 'es');
    c.set('planCode', (user['planCode'] as string) ?? 'free');
    c.set('emailVerified', Boolean(user['emailVerified']));

    // El logger del pedido ya lleva el requestId; se le suma el usuario.
    c.set('logger', c.get('logger').child({ userId: String(user['id']) }));
    await next();
  });
}

/**
 * Exige el email verificado.
 *
 * Va **solo donde importa** —cobrar, compartir con un coach—, no en el ingreso:
 * bloquear la entrada dejaria al arquero afuera si el mail tarda, y todavia no
 * hay nada que proteger.
 */
export const requireVerifiedEmail = createMiddleware<AppEnv>(async (c, next) => {
  if (!c.get('emailVerified')) throw new AppError(AUTH_ERRORS.emailNotVerified);
  await next();
});
