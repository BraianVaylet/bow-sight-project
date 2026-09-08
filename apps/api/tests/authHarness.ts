import { Temporal } from '@js-temporal/polyfill';
import pino from 'pino';
import { createApp } from '../src/app.js';
import { createAuth } from '../src/auth/auth.js';
import { createReadinessCheck } from '../src/db/connection.js';
import { createModules, type Modules } from '../src/modules/index.js';
import { systemClock } from '../src/persistence/clock.js';
import { MemoryMailer } from '../src/notifications/mailer.js';
import { startTestMongo, type TestMongo } from './mongo.js';
import { testEnv } from './helpers.js';

export interface AuthHarness {
  app: ReturnType<typeof createApp>;
  auth: ReturnType<typeof createAuth>;
  modules: Modules;
  mailer: MemoryMailer;
  mongo: TestMongo;
  stop: () => Promise<void>;
  reset: () => Promise<void>;
}

/** App completa con auth real contra un Mongo efimero. El mail queda en memoria. */
export async function startAuthHarness(): Promise<AuthHarness> {
  const mongo = await startTestMongo();
  const db = mongo.connection.db!;
  const mailer = new MemoryMailer();

  const env = testEnv({ BETTER_AUTH_SECRET: 'x'.repeat(48), BETTER_AUTH_URL: 'http://localhost' });
  const auth = createAuth({
    db,
    client: mongo.connection.getClient(),
    env,
    logger: pino({ level: 'silent' }),
    mailer,
  });

  const modules = createModules({ connection: mongo.connection, now: systemClock });

  const app = createApp({
    env,
    auth,
    modules,
    logger: pino({ level: 'silent' }),
    now: () => Temporal.Now.instant().toString(),
    isDatabaseReady: createReadinessCheck(mongo.connection),
  });

  return {
    app,
    auth,
    modules,
    mailer,
    mongo,
    stop: () => mongo.stop(),
    reset: async () => {
      mailer.clear();
      for (const c of [
        'user',
        'session',
        'account',
        'verification',
        'bowSetup',
        'arrowSet',
        'sight',
        'mark',
      ]) {
        await db.collection(c).deleteMany({});
      }
    },
  };
}

/** Saca el token del enlace que viajo en el mail. */
export function tokenFromUrl(url: string | undefined): string {
  if (!url) throw new Error('el mail no traia url');
  const match = /[?&]token=([^&]+)/.exec(url);
  return match?.[1] ?? new URL(url).pathname.split('/').pop() ?? '';
}

/** Junta las cookies de una respuesta para reusarlas como sesion. */
export function cookiesOf(res: Response): string {
  return res.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
}
