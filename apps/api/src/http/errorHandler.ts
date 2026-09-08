import { SYS_ERRORS, type ApiErrorBody } from '@bow-sight/types';
import type { ErrorHandler, NotFoundHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { AppError } from './errors.js';
import type { AppDeps, AppEnv } from '../types.js';

function envelope(args: {
  code: string;
  messageKey: string;
  // Explicitamente `| undefined`: con `exactOptionalPropertyTypes` no es lo
  // mismo que `?`, y aca llega un `AppError` que siempre trae la propiedad.
  params?: Record<string, string | number> | undefined;
  requestId: string;
  timestamp: string;
}): ApiErrorBody {
  return {
    success: false,
    error: {
      code: args.code as ApiErrorBody['error']['code'],
      messageKey: args.messageKey,
      ...(args.params ? { params: args.params } : {}),
      requestId: args.requestId,
      timestamp: args.timestamp,
    },
  };
}

/**
 * Traduce cualquier throw al envelope unico de la spec §5.0.
 *
 * 🔴 Un error no controlado sale como `BS-SYS-500-005` y **no filtra nada**: ni
 * el mensaje, ni el stack, ni el nombre de la coleccion que fallo. Eso va al
 * log, con el mismo `requestId` que ve el usuario.
 */
export function createErrorHandler(deps: Pick<AppDeps, 'now'>): ErrorHandler<AppEnv> {
  return (err, c) => {
    const requestId = c.get('requestId') ?? 'unknown';
    const logger = c.get('logger');

    if (err instanceof AppError) {
      logger?.warn(
        { requestId, errorCode: err.code, action: c.req.path, meta: err.params },
        'request rejected',
      );
      return c.json(
        envelope({ ...err, requestId, timestamp: deps.now() }),
        err.status as ContentfulStatusCode,
      );
    }

    logger?.error(
      { requestId, errorCode: SYS_ERRORS.internal.code, action: c.req.path, err },
      'unhandled error',
    );
    return c.json(
      envelope({ ...SYS_ERRORS.internal, requestId, timestamp: deps.now() }),
      SYS_ERRORS.internal.status as ContentfulStatusCode,
    );
  };
}

/** Una ruta que no existe responde con la misma forma que todo lo demas. */
export function createNotFoundHandler(deps: Pick<AppDeps, 'now'>): NotFoundHandler<AppEnv> {
  return (c) =>
    c.json(
      envelope({
        ...SYS_ERRORS.notFound,
        requestId: c.get('requestId') ?? 'unknown',
        timestamp: deps.now(),
      }),
      SYS_ERRORS.notFound.status as ContentfulStatusCode,
    );
}
