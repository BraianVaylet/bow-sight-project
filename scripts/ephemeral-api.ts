import { serve } from '@hono/node-server';
import { Temporal } from '@js-temporal/polyfill';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import pino from 'pino';
import { createApp } from '../apps/api/src/app.js';
import { createAuth } from '../apps/api/src/auth/auth.js';
import { connectDatabase, createReadinessCheck } from '../apps/api/src/db/connection.js';
import { checkEnv } from '../apps/api/src/env.schema.js';
import { createModules } from '../apps/api/src/modules/index.js';
import { MemoryMailer } from '../apps/api/src/notifications/mailer.js';
import { systemClock } from '../apps/api/src/persistence/clock.js';

/**
 * La API contra un Mongo **efimero, en memoria y en replica set**.
 *
 * La usan dos cosas, porque el requisito es el mismo —una base de verdad, con
 * transacciones, que no haya que instalar—: los E2E
 * (`e2e/support/api-server.ts`) y el sandbox local (`pnpm dev:sandbox`).
 *
 * 🔴 Replica set y no un nodo suelto: sin el no hay transacciones, y la mitad de
 * lo que hay que probar —que una operacion a medias no deje nada escrito— no se
 * puede probar sin ellas.
 *
 * 🔴 Nunca apunta a staging ni a produccion: escribe.
 *
 * 🔴 **Los datos se pierden al cerrarlo, y es a proposito.** Un sandbox que
 * sobrevive tienta a usarlo como si fuera un ambiente, y despues alguien se
 * apoya en datos que nadie puede reproducir.
 */
export interface EphemeralApi {
  url: string;
  /** Los mails "enviados", para poder sacar el enlace de verificacion. */
  mailboxUrl: string;
  stop: () => Promise<void>;
}

export async function startEphemeralApi(
  options: { port?: number; verbose?: boolean } = {},
): Promise<EphemeralApi> {
  const port = options.port ?? 3000;
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });

  // En el sandbox los logs sirven; en los E2E solo ensucian la salida.
  const logger = pino({ level: options.verbose ? 'info' : 'silent' });

  const connection = await connectDatabase({
    uri: replSet.getUri(),
    dbName: 'bow_sight_sandbox',
    logger,
  });

  const { env } = checkEnv({
    APP_ENV: 'test',
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:5176',
    BETTER_AUTH_SECRET: 'e'.repeat(48),
    BETTER_AUTH_URL: `http://localhost:${port}`,
    PWA_URL: 'http://localhost:5173',
  });
  if (!env) throw new Error('el entorno del sandbox tiene que ser valido');

  const db = connection.db;
  if (!db) throw new Error('la conexion no expone una base');

  /**
   * El mail queda en memoria y se lee por HTTP.
   *
   * Es la unica forma de llegar al enlace de verificacion sin mandar correo de
   * verdad. **Solo existe aca**: la API de produccion no monta estas rutas.
   */
  const mailer = new MemoryMailer();

  const app = createApp({
    env,
    auth: createAuth({ db, client: connection.getClient(), env, logger, mailer }),
    modules: createModules({ connection, now: systemClock }),
    logger,
    now: () => Temporal.Now.instant().toString(),
    isDatabaseReady: createReadinessCheck(connection),
  });

  app.get('/e2e/mails', (c) => c.json(mailer.sent));
  app.delete('/e2e/mails', (c) => {
    mailer.clear();
    return c.body(null, 204);
  });

  const server = serve({ fetch: app.fetch, port });

  return {
    url: `http://localhost:${port}`,
    mailboxUrl: `http://localhost:${port}/e2e/mails`,
    stop: async () => {
      server.close();
      await connection.close();
      await replSet.stop();
    },
  };
}

/** Cierra ordenado ante Ctrl+C, para no dejar el proceso de Mongo colgado. */
export function stopOnSignals(api: EphemeralApi): void {
  const bajar = () => {
    void api.stop().then(() => process.exit(0));
  };
  process.on('SIGINT', bajar);
  process.on('SIGTERM', bajar);
}
