import { SYS_ERRORS, type ErrorCode } from '@bow-sight/types';

/**
 * Error de dominio con su codigo tipado.
 *
 * 🔴 Lleva **clave de mensaje**, no prosa: el idioma lo resuelve el cliente
 * (ADR-005). Un `catch` que solo loguea, sin codigo, no cumple el DoD.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly messageKey: string;
  readonly params: Record<string, string | number> | undefined;

  constructor(args: {
    status: number;
    code: ErrorCode;
    messageKey: string;
    params?: Record<string, string | number>;
  }) {
    // El `message` es para el log y el stack, nunca para el usuario.
    super(`${args.code} ${args.messageKey}`);
    this.name = 'AppError';
    this.status = args.status;
    this.code = args.code;
    this.messageKey = args.messageKey;
    this.params = args.params;
  }
}

/** Construye un `AppError` desde una entrada del diccionario de `docs/errors.md`. */
export function appError(
  entry: { code: ErrorCode; status: number; messageKey: string },
  params?: Record<string, string | number>,
): AppError {
  return new AppError({ ...entry, ...(params ? { params } : {}) });
}

export const validationError = (params?: Record<string, string | number>) =>
  appError(SYS_ERRORS.validation, params);
export const notFoundError = () => appError(SYS_ERRORS.notFound);
export const rateLimitedError = () => appError(SYS_ERRORS.rateLimited);
export const unavailableError = () => appError(SYS_ERRORS.unavailable);
