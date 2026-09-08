import type { ApiErrorBody, ErrorCode } from '@bow-sight/types';

/**
 * Error de la API, ya desarmado.
 *
 * 🔴 Lleva `messageKey` y `params`, no prosa: el idioma lo resuelve el cliente
 * (ADR-005). Traducirlo es responsabilidad de la capa de UI, no de esta.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode | 'NETWORK';
  readonly messageKey: string;
  readonly params: Record<string, string | number> | undefined;
  readonly requestId: string | undefined;

  constructor(args: {
    status: number;
    code: ErrorCode | 'NETWORK';
    messageKey: string;
    params?: Record<string, string | number> | undefined;
    requestId?: string | undefined;
  }) {
    super(`${args.code} ${args.messageKey}`);
    this.name = 'ApiError';
    this.status = args.status;
    this.code = args.code;
    this.messageKey = args.messageKey;
    this.params = args.params;
    this.requestId = args.requestId;
  }

  /** Sin red. Se distingue de un error del servidor para poder reintentar. */
  static network(): ApiError {
    return new ApiError({ status: 0, code: 'NETWORK', messageKey: 'errors.network.offline' });
  }

  static fromBody(status: number, body: unknown): ApiError {
    const envelope = body as Partial<ApiErrorBody>;
    const error = envelope?.error;

    if (!error?.code) {
      return new ApiError({ status, code: 'BS-SYS-500-005', messageKey: 'errors.system.internal' });
    }
    return new ApiError({
      status,
      code: error.code,
      messageKey: error.messageKey,
      params: error.params,
      requestId: error.requestId,
    });
  }
}
