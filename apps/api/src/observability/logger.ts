import { Temporal } from '@js-temporal/polyfill';
import pino, { type Logger } from 'pino';
import type { Env } from '../env.schema.js';

/**
 * Logger JSON con el formato de la spec §10.1, igual en todos lados:
 * `ts, level, env, service, module, action, requestId, userId, durationMs,
 * errorCode, msg, meta`.
 *
 * 🔴 **Nunca se loguean** contraseñas, tokens ni datos de tarjeta. Ni en `meta`.
 */
export function createLogger(
  env: Pick<Env, 'APP_ENV' | 'LOG_LEVEL'>,
  /** Destino alternativo. Existe para poder verificar la redaccion en un test. */
  destination?: pino.DestinationStream,
): Logger {
  const options: pino.LoggerOptions = {
    level: env.LOG_LEVEL,
    base: { env: env.APP_ENV, service: 'api' },
    // Temporal, no `Date`: es la regla del proyecto y aplica tambien aca.
    timestamp: () => `,"ts":"${Temporal.Now.instant().toString()}"`,
    redact: {
      // Red de seguridad, no reemplazo del criterio: si un campo sensible llega
      // hasta aca, al menos no queda escrito.
      paths: [
        'password',
        '*.password',
        'token',
        '*.token',
        'authorization',
        'req.headers.authorization',
        'req.headers.cookie',
        'meta.password',
        'meta.token',
      ],
      censor: '[redactado]',
    },
  };

  return destination ? pino(options, destination) : pino(options);
}

/** Campos que todo log de la API puede llevar. */
export interface LogFields {
  module?: string;
  action?: string;
  requestId?: string;
  userId?: string;
  durationMs?: number;
  errorCode?: string;
  meta?: Record<string, unknown>;
}
