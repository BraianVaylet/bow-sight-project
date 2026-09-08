import { z } from 'zod';

/**
 * Schema del entorno, **puro**: no lee `process.env` ni corta el proceso.
 *
 * Esta separado de `env.ts` a proposito. El cargador termina el proceso cuando
 * falta una variable, y eso mataria a cualquier herramienta que solo quiera el
 * schema — un script de migracion, un test, el generador de OpenAPI.
 */
export const envSchema = z.object({
  APP_ENV: z.enum(['dev', 'test', 'staging', 'prod']).default('dev'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  MONGODB_URI: z.string().min(1).optional(),
  MONGODB_DB_NAME: z.string().min(1).optional(),

  BETTER_AUTH_SECRET: z.string().min(32).optional(),
  BETTER_AUTH_URL: z.string().url().optional(),

  /** A donde vuelve el arquero desde un mail. Sin esto los enlaces no van a ningun lado. */
  PWA_URL: z.string().url().default('http://localhost:5173'),

  RESEND_API_KEY: z.string().min(1).optional(),
  MAIL_FROM: z.string().min(1).default('Bow Sight <no-reply@bowsight.app>'),

  /** Origenes explicitos, separados por coma. Sin comodines. */
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((raw) =>
      raw
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  JOBS_ENABLED: z
    .string()
    .default('true')
    .transform((raw) => raw !== 'false'),
});

export type Env = z.infer<typeof envSchema>;

/** Las que no pueden faltar en un ambiente desplegado. */
export const REQUIRED_IN_DEPLOYED = [
  'MONGODB_URI',
  'MONGODB_DB_NAME',
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'CORS_ORIGINS',
  // Sin esto, un ambiente desplegado no puede verificar un email ni resetear
  // una contraseña: la cuenta queda inaccesible y no se nota hasta que alguien
  // la necesita.
  'RESEND_API_KEY',
] as const;

export interface EnvProblem {
  variable: string;
  reason: string;
}

/**
 * Valida un entorno crudo y devuelve los problemas, sin lanzar.
 * Quien decide que hacer con ellos es el llamador.
 */
export function checkEnv(raw: Record<string, string | undefined>): {
  env?: Env;
  problems: EnvProblem[];
} {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      problems: parsed.error.issues.map((issue) => ({
        variable: issue.path.join('.') || '(raiz)',
        reason: issue.message,
      })),
    };
  }

  const env = parsed.data;
  const problems: EnvProblem[] = [];

  // En dev y en test se puede levantar sin base: sirve para probar el arranque
  // y los healthchecks sin depender de nada.
  if (env.APP_ENV === 'staging' || env.APP_ENV === 'prod') {
    for (const variable of REQUIRED_IN_DEPLOYED) {
      const value = variable === 'CORS_ORIGINS' ? env.CORS_ORIGINS.length : raw[variable];
      if (!value) problems.push({ variable, reason: `Obligatoria en ${env.APP_ENV}.` });
    }
  }

  return problems.length > 0 ? { problems } : { env, problems };
}
