import { serve } from '@hono/node-server';
import { Temporal } from '@js-temporal/polyfill';
import { createApp } from './app.js';
import { createAuth } from './auth/auth.js';
import { createModules } from './modules/index.js';
import { systemClock } from './persistence/clock.js';
import { connectDatabase, createReadinessCheck, supportsTransactions } from './db/connection.js';
import { loadEnv } from './env.js';
import { ConsoleMailer, type Mailer } from './notifications/mailer.js';
import { ResendMailer } from './notifications/resend.js';
import { createLogger } from './observability/logger.js';

const env = loadEnv();
const logger = createLogger(env);

/**
 * Sin `MONGODB_URI` la API levanta igual, pero `/ready` responde 503.
 *
 * Es para poder probar el arranque y los healthchecks en dev sin depender de
 * nada. En `staging` y `prod` la variable es obligatoria y `loadEnv` corta antes
 * de llegar aca, asi que este camino no existe en un ambiente desplegado.
 */
async function connect() {
  if (!env.MONGODB_URI || !env.MONGODB_DB_NAME) {
    logger.warn(
      { module: 'db', action: 'connect' },
      'sin MONGODB_URI: la api levanta, pero /ready va a responder 503',
    );
    return { isDatabaseReady: async () => false, auth: undefined, modules: undefined };
  }

  const connection = await connectDatabase({
    uri: env.MONGODB_URI,
    dbName: env.MONGODB_DB_NAME,
    logger,
  });

  // 🔴 Se verifica al arrancar en vez de descubrirlo cuando falla el primer
  // cobro: sin replica set, las transacciones de los webhooks no existen.
  if (!(await supportsTransactions(connection))) {
    logger.error(
      { module: 'db', action: 'connect' },
      'el cluster no es replica set: las transacciones de cobro van a fallar en runtime',
    );
    if (env.APP_ENV === 'staging' || env.APP_ENV === 'prod') process.exit(1);
  }

  const db = connection.db;
  if (!db) throw new Error('la conexion no expone una base');

  return {
    isDatabaseReady: createReadinessCheck(connection),
    modules: createModules({ connection, now: systemClock }),
    auth: createAuth({
      db,
      client: connection.getClient(),
      env,
      logger,
      mailer: createMailer(),
    }),
  };
}

/**
 * En dev, sin clave de Resend, los mails se loguean en vez de enviarse: alcanza
 * para copiar el enlace de verificacion de la consola.
 *
 * 🔴 En un ambiente desplegado eso seria escribir un token de un solo uso en los
 * logs, asi que ahi la clave es obligatoria.
 */
function createMailer(): Mailer {
  const isDeployed = env.APP_ENV === 'staging' || env.APP_ENV === 'prod';

  if (!env.RESEND_API_KEY) {
    if (isDeployed) {
      logger.error({ module: 'notifications' }, 'falta RESEND_API_KEY en un ambiente desplegado');
      process.exit(1);
    }
    return new ConsoleMailer(logger);
  }

  return new ResendMailer({ apiKey: env.RESEND_API_KEY, from: env.MAIL_FROM, logger });
}

const { isDatabaseReady, auth, modules } = await connect();

const app = createApp({
  env,
  auth,
  modules,
  logger,
  now: () => Temporal.Now.instant().toString(),
  isDatabaseReady,
});

serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  logger.info({ module: 'boot', action: 'listen', meta: { port: info.port } }, 'api escuchando');
});
