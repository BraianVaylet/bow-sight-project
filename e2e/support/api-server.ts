import { serve } from '@hono/node-server';
import { Temporal } from '@js-temporal/polyfill';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import pino from 'pino';
import { createApp } from '../../apps/api/src/app.js';
import { createAuth } from '../../apps/api/src/auth/auth.js';
import { connectDatabase, createReadinessCheck } from '../../apps/api/src/db/connection.js';
import { checkEnv } from '../../apps/api/src/env.schema.js';
import { createModules } from '../../apps/api/src/modules/index.js';
import { MemoryMailer } from '../../apps/api/src/notifications/mailer.js';
import { systemClock } from '../../apps/api/src/persistence/clock.js';

/**
 * La API de los E2E, contra un Mongo **efimero en memoria y en replica set**.
 *
 * 🔴 Replica set y no un nodo suelto: sin el no hay transacciones, y la mitad
 * de lo que hay que probar —que una operacion a medias no deje nada escrito—
 * no se puede probar sin ellas.
 *
 * 🔴 Nunca apunta a staging ni a produccion. Estos tests escriben.
 */
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
const logger = pino({ level: 'silent' });

const connection = await connectDatabase({
  uri: replSet.getUri(),
  dbName: 'bow_sight_e2e',
  logger,
});

const { env } = checkEnv({
  APP_ENV: 'test',
  CORS_ORIGINS: 'http://localhost:5173,http://localhost:5176',
  BETTER_AUTH_SECRET: 'e'.repeat(48),
  BETTER_AUTH_URL: 'http://localhost:3000',
  PWA_URL: 'http://localhost:5173',
});
if (!env) throw new Error('el entorno del arnes de E2E tiene que ser valido');

const db = connection.db;
if (!db) throw new Error('la conexion no expone una base');

/**
 * El mail queda en memoria y se lee por HTTP.
 *
 * Es la unica forma de probar verificacion y recupero de clave de punta a
 * punta sin mandar correo de verdad desde el CI. Solo existe en este arnes.
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

const server = serve({ fetch: app.fetch, port: 3000 });

async function bajar() {
  server.close();
  await connection.close();
  await replSet.stop();
  process.exit(0);
}

process.on('SIGINT', () => void bajar());
process.on('SIGTERM', () => void bajar());
