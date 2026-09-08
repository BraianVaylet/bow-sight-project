import { describe, expect, it } from 'vitest';
import { checkEnv } from './env.schema.js';

describe('checkEnv', () => {
  it('en dev arranca sin base: sirve para probar el arranque sin depender de nada', () => {
    const { env, problems } = checkEnv({ APP_ENV: 'dev' });
    expect(problems).toEqual([]);
    expect(env?.PORT).toBe(3000);
    expect(env?.LOG_LEVEL).toBe('info');
  });

  it('🔴 en prod exige todo lo que la API necesita, y lo lista junto', () => {
    const { env, problems } = checkEnv({ APP_ENV: 'prod' });

    expect(env).toBeUndefined();
    // Lista **todas** las que faltan, no la primera: si no, arreglar el deploy
    // son cinco vueltas en vez de una.
    expect(problems.map((p) => p.variable)).toEqual([
      'MONGODB_URI',
      'MONGODB_DB_NAME',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL',
      'CORS_ORIGINS',
      'RESEND_API_KEY',
    ]);
  });

  it('en prod, con todo cargado, valida', () => {
    const { env, problems } = checkEnv({
      APP_ENV: 'prod',
      MONGODB_URI: 'mongodb+srv://host/?replicaSet=rs0',
      MONGODB_DB_NAME: 'bow_sight',
      BETTER_AUTH_SECRET: 'x'.repeat(32),
      BETTER_AUTH_URL: 'https://api.bowsight.app',
      CORS_ORIGINS: 'https://app.bowsight.app,https://bowsight.app',
      RESEND_API_KEY: 're_test',
    });

    expect(problems).toEqual([]);
    expect(env?.CORS_ORIGINS).toEqual(['https://app.bowsight.app', 'https://bowsight.app']);
  });

  it('rechaza un secreto corto: 32 bytes no es una sugerencia', () => {
    const { env, problems } = checkEnv({ APP_ENV: 'prod', BETTER_AUTH_SECRET: 'corto' });
    expect(env).toBeUndefined();
    expect(problems.some((p) => p.variable === 'BETTER_AUTH_SECRET')).toBe(true);
  });

  it('los origenes de CORS se parten y se limpian, sin dejar vacios', () => {
    const { env } = checkEnv({ CORS_ORIGINS: ' http://a.com , , http://b.com ' });
    expect(env?.CORS_ORIGINS).toEqual(['http://a.com', 'http://b.com']);
  });

  it('sin CORS_ORIGINS la lista queda vacia, no con un comodin', () => {
    const { env } = checkEnv({});
    expect(env?.CORS_ORIGINS).toEqual([]);
  });

  it('JOBS_ENABLED se apaga solo con el string exacto', () => {
    expect(checkEnv({ JOBS_ENABLED: 'false' }).env?.JOBS_ENABLED).toBe(false);
    expect(checkEnv({ JOBS_ENABLED: 'true' }).env?.JOBS_ENABLED).toBe(true);
    expect(checkEnv({}).env?.JOBS_ENABLED).toBe(true);
  });

  it('rechaza un puerto que no es un puerto', () => {
    expect(checkEnv({ PORT: 'ochenta' }).env).toBeUndefined();
    expect(checkEnv({ PORT: '-1' }).env).toBeUndefined();
  });
});
