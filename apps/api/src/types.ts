import type { Logger } from 'pino';
// Solo el tipo: no crea ciclo en runtime.
import type { Auth } from './auth/auth.js';
import type { Modules } from './modules/index.js';
import type { Env } from './env.schema.js';

/** Variables que viajan en el contexto de Hono. */
export interface AppEnv {
  Variables: {
    requestId: string;
    logger: Logger;
    /** Lo setea `requireAuth`. 🔴 Sale de la sesion, nunca del pedido. */
    userId?: string;
    locale?: 'es' | 'en';
    planCode?: string;
    emailVerified?: boolean;
  };
  Bindings: Record<string, never>;
}

export interface AppDeps {
  env: Env;
  /**
   * Auth. Es opcional porque sin base no hay auth, y la API tiene que levantar
   * igual para servir sus healthchecks (ver `index.ts`).
   */
  auth?: Auth | undefined;
  /** Los modulos de negocio. Sin base no hay modulos, igual que con auth. */
  modules?: Modules | undefined;
  logger: Logger;
  /** El reloj se inyecta: sin esto no se puede probar un vencimiento. */
  now: () => string;
  /** Responde si la base contesta. En F0-13 lo implementa Mongo. */
  isDatabaseReady: () => Promise<boolean>;
}
