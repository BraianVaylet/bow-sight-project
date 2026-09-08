import { Hono } from 'hono';
import { z } from 'zod';
import { AppError } from '../http/errors.js';
import type { AppEnv } from '../types.js';
import type { Auth } from './auth.js';
import { mapAuthError } from './errors.js';

/**
 * Rutas de auth **envueltas**, no montadas tal cual.
 *
 * Better Auth trae su propio handler y su propio formato de error. Montarlo
 * directo dejaria un unico rincon de la API que responde distinto a todo lo
 * demas, y el cliente tendria que saber dos formas de leer un error. Aca se
 * llama a su API de servidor y se traduce al envelope unico (spec §5.0).
 */

const email = z.string().trim().toLowerCase().email().max(254);
// 12 caracteres: la spec pide 12 en el schema compartido; Better Auth valida lo mismo.
const password = z.string().min(12).max(128);

const signUpSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(80),
  locale: z.enum(['es', 'en']).default('es'),
});
const signInSchema = z.object({ email, password });
const emailOnlySchema = z.object({ email });
const resetSchema = z.object({ token: z.string().min(1), newPassword: password });

/** Lee el cuerpo con Zod y convierte un fallo en nuestro 400 tipado. */
async function parse<T>(c: { req: { json: () => Promise<unknown> } }, schema: z.ZodType<T>) {
  const raw = await c.req.json().catch(() => ({}));
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new AppError({
      status: 400,
      code: 'BS-SYS-400-001',
      messageKey: 'errors.system.validation',
      params: { field: result.error.issues[0]?.path.join('.') ?? 'body' },
    });
  }
  return result.data;
}

/**
 * Llama a Better Auth y devuelve su `Response`, o lanza un `AppError` con
 * nuestro codigo. Las cookies de sesion viajan en esa misma `Response`.
 */
async function call(run: () => Promise<Response>): Promise<Response> {
  const res = await run();
  if (res.ok) return res;

  const body = (await res.json().catch(() => ({}))) as { code?: string };
  const entry = mapAuthError(res.status, body.code);
  throw new AppError(entry);
}

/** Copia las cookies que puso Better Auth a nuestra respuesta. */
function withCookies(from: Response, to: Response): Response {
  for (const cookie of from.headers.getSetCookie()) {
    to.headers.append('set-cookie', cookie);
  }
  return to;
}

export interface AuthRoutesDeps {
  auth: Auth;
  /** A donde vuelve el arquero despues de verificar. */
  pwaUrl: string;
}

export function createAuthRoutes({ auth, pwaUrl }: AuthRoutesDeps) {
  const app = new Hono<AppEnv>();

  /**
   * Destino del enlace del mail de verificacion.
   *
   * 🔴 Redirige a la PWA, no devuelve JSON: el arquero llega aca desde su
   * cliente de correo y tiene que terminar en una pantalla, no en un `{ok:true}`.
   * Y no filtra por que fallo: un token vencido y uno inventado se ven igual.
   */
  app.get('/verify-email', async (c) => {
    const token = c.req.query('token');
    if (!token) return c.redirect(`${pwaUrl}/email-verificado?estado=invalido`, 302);

    try {
      await auth.api.verifyEmail({ query: { token }, headers: c.req.raw.headers });
      return c.redirect(`${pwaUrl}/email-verificado?estado=ok`, 302);
    } catch {
      return c.redirect(`${pwaUrl}/email-verificado?estado=invalido`, 302);
    }
  });

  app.post('/sign-up', async (c) => {
    const body = await parse(c, signUpSchema);
    const res = await call(() =>
      auth.api.signUpEmail({ body, headers: c.req.raw.headers, asResponse: true }),
    );
    // 201: se creo una cuenta. El mail de verificacion ya salio.
    return withCookies(res, c.json({ success: true, emailVerificationSent: true }, 201));
  });

  app.post('/sign-in', async (c) => {
    const body = await parse(c, signInSchema);
    const res = await call(() =>
      auth.api.signInEmail({ body, headers: c.req.raw.headers, asResponse: true }),
    );
    return withCookies(res, c.json({ success: true }));
  });

  app.post('/sign-out', async (c) => {
    const res = await call(() =>
      auth.api.signOut({ headers: c.req.raw.headers, asResponse: true }),
    );
    return withCookies(res, c.body(null, 204));
  });

  app.get('/me', async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      throw new AppError({
        status: 401,
        code: 'BS-AUTH-401-002',
        messageKey: 'errors.auth.sessionExpired',
      });
    }
    const user = session.user as Record<string, unknown>;
    return c.json({
      id: user['id'],
      email: user['email'],
      name: user['name'],
      emailVerified: user['emailVerified'],
      locale: user['locale'] ?? 'es',
      distanceUnit: user['distanceUnit'] ?? 'm',
      planCode: user['planCode'] ?? 'free',
    });
  });

  app.post('/verify-email/resend', async (c) => {
    const body = await parse(c, emailOnlySchema);
    await call(() =>
      auth.api.sendVerificationEmail({ body, headers: c.req.raw.headers, asResponse: true }),
    );
    return c.body(null, 204);
  });

  app.post('/password-reset/request', async (c) => {
    const body = await parse(c, emailOnlySchema);
    // 🔴 Siempre 204, exista o no el email. Responder distinto convertiria este
    // endpoint en un buscador de cuentas.
    await auth.api
      .requestPasswordReset({ body, headers: c.req.raw.headers, asResponse: true })
      .catch(() => undefined);
    return c.body(null, 204);
  });

  app.post('/password-reset/confirm', async (c) => {
    const body = await parse(c, resetSchema);
    await call(() =>
      auth.api.resetPassword({ body, headers: c.req.raw.headers, asResponse: true }),
    );
    // El reset revoca todas las sesiones: hay que volver a entrar.
    return c.body(null, 204);
  });

  return app;
}
