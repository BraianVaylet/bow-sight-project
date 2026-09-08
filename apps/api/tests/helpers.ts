import pino from 'pino';
import { createApp } from '../src/app.js';
import { checkEnv, type Env } from '../src/env.schema.js';

/** Entorno minimo y valido para los tests. */
export function testEnv(overrides: Partial<Env> = {}): Env {
  const { env } = checkEnv({ APP_ENV: 'test', CORS_ORIGINS: 'http://localhost:5173' });
  if (!env) throw new Error('El entorno de test tiene que ser valido');
  return { ...env, ...overrides };
}

/**
 * App de test con sus dependencias inyectadas: reloj fijo y base simulada.
 * Con el reloj fijo, el `timestamp` del envelope es verificable.
 */
export function makeApp(options: { databaseReady?: boolean; now?: string } = {}) {
  const now = options.now ?? '2026-09-07T12:00:00Z';
  return createApp({
    env: testEnv(),
    // `silent`: los tests no ensucian la salida, pero el logger existe de verdad.
    logger: pino({ level: 'silent' }),
    now: () => now,
    isDatabaseReady: async () => options.databaseReady ?? true,
  });
}
