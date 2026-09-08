import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { LOCALES, PLAN_CODES, DISTANCE_UNITS } from '@bow-sight/types';
import { betterAuth } from 'better-auth';
import type { Db, MongoClient } from 'mongodb';
import type { Logger } from 'pino';
import type { Env } from '../env.schema.js';
import type { Mailer } from '../notifications/mailer.js';

export interface AuthDeps {
  db: Db;
  client: MongoClient;
  env: Env;
  logger: Logger;
  mailer: Mailer;
}

/**
 * Idioma del usuario, tolerante a un valor viejo o vacio en la base.
 *
 * Recibe `object` porque los callbacks de Better Auth tipan el `user` base, sin
 * los `additionalFields`: `locale` esta ahi en runtime pero no en el tipo.
 */
function localeOf(user: object): 'es' | 'en' {
  const locale = (user as Record<string, unknown>)['locale'];
  return LOCALES.includes(locale as never) ? (locale as 'es' | 'en') : 'es';
}

/**
 * Configura Better Auth.
 *
 * 🔴 La cookie de sesion es `SameSite=Lax`, **no `Strict`**. Tanto Stripe
 * Checkout como el `back_url` de Mercado Pago vuelven por una navegacion
 * cross-site, y con `Strict` el navegador no manda la cookie: el arquero
 * aterriza deslogueado y cree que el pago fallo (ADR-003).
 */
export function createAuth({ db, client, env, logger, mailer }: AuthDeps) {
  const isDeployed = env.APP_ENV === 'staging' || env.APP_ENV === 'prod';

  return betterAuth({
    appName: 'Bow Sight',
    ...(env.BETTER_AUTH_SECRET ? { secret: env.BETTER_AUTH_SECRET } : {}),
    ...(env.BETTER_AUTH_URL ? { baseURL: env.BETTER_AUTH_URL } : {}),
    database: mongodbAdapter(db, { client }),
    trustedOrigins: env.CORS_ORIGINS,

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      // Verificar antes de cobrar, no antes de entrar: bloquear el ingreso deja
      // al arquero afuera si el mail tarda, y todavia no hay nada que proteger.
      requireEmailVerification: false,
      // 🔴 El enlace apunta a la **PWA**, no a la API. El arquero tiene que
      // aterrizar en una pantalla donde pueda escribir su clave nueva, no en la
      // respuesta cruda de un endpoint.
      sendResetPassword: async ({ user, token }) => {
        await mailer.send({
          to: user.email,
          template: 'resetPassword',
          locale: localeOf(user),
          params: { url: `${env.PWA_URL}/restablecer?token=${token}` },
        });
      },
      // 🔴 Cambiar la contraseña invalida **todas** las sesiones anteriores: si
      // alguien la cambio porque le entraron, el intruso tiene que quedar afuera.
      revokeSessionsOnPasswordReset: true,
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60 * 24,
      // Apunta a **nuestra** ruta, que verifica y redirige a la PWA. Sin esto,
      // el mail lleva a la ruta por defecto de Better Auth, que no esta montada
      // porque las rutas de auth van envueltas en nuestro envelope: el enlace
      // responderia 404 y la cuenta quedaria sin poder verificarse nunca.
      sendVerificationEmail: async ({ user, token }) => {
        const base = env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;
        await mailer.send({
          to: user.email,
          template: 'verifyEmail',
          locale: localeOf(user),
          params: {
            url: `${base}/api/v1/auth/verify-email?token=${token}`,
            name: user.name ?? '',
          },
        });
      },
    },

    user: {
      additionalFields: {
        locale: { type: 'string', required: false, defaultValue: 'es', input: true },
        distanceUnit: { type: 'string', required: false, defaultValue: 'm', input: true },
        // 🔴 `input: false`: el plan lo escriben los webhooks de cobro, jamas el
        // cliente. Si fuera editable, cualquiera se pondria en `max`.
        planCode: { type: 'string', required: false, defaultValue: 'free', input: false },
        planValidUntil: { type: 'date', required: false, input: false },
      },
      changeEmail: {
        enabled: true,
        // Se verifica la direccion **nueva** y se avisa a la vieja.
        sendChangeEmailVerification: async ({
          user,
          newEmail,
          token,
        }: {
          user: { email: string; name?: string | null };
          newEmail: string;
          token: string;
        }) => {
          const base = env.BETTER_AUTH_URL ?? `http://localhost:${env.PORT}`;
          const url = `${base}/api/v1/auth/verify-email?token=${token}`;
          await mailer.send({
            to: newEmail,
            template: 'verifyEmail',
            locale: localeOf(user),
            params: { url, name: user.name ?? '' },
          });
          await mailer.send({
            to: user.email,
            template: 'emailChanged',
            locale: localeOf(user),
            params: { newEmail },
          });
        },
      },
    },

    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },

    advanced: {
      cookiePrefix: 'bs',
      defaultCookieAttributes: {
        httpOnly: true,
        secure: isDeployed,
        sameSite: 'lax',
        path: '/',
      },
    },

    logger: {
      disabled: false,
      log: (level, message) => {
        const fn = level === 'error' ? logger.error : level === 'warn' ? logger.warn : logger.info;
        fn.call(logger, { module: 'auth', action: 'better-auth' }, message);
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Valores permitidos, expuestos para que los schemas Zod no los dupliquen. */
export const AUTH_ENUMS = { LOCALES, PLAN_CODES, DISTANCE_UNITS } as const;
