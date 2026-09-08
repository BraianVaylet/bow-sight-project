/**
 * Codigos de error y forma de la respuesta.
 *
 * El diccionario completo, con su significado y su clave de mensaje, vive en
 * `docs/errors.md`. Declarar un codigo nuevo alli es parte del Definition of
 * Ready: una tarea no arranca sin sus codigos declarados.
 */

/** `BS-<MODULE>-<HTTP>-<NNN>` */
export type ErrorCode = `BS-${string}-${number}-${string}`;

/** Modulos que pueden emitir errores. El prefijo sale de `docs/errors.md`. */
export const ERROR_MODULES = [
  'AUTH',
  'ACCT',
  'EQUIP',
  'SIGHT',
  'MARK',
  'UNIT',
  'SHARE',
  'BILL',
  'SUBS',
  'ENTL',
  'CRM',
  'SYS',
] as const;
export type ErrorModule = (typeof ERROR_MODULES)[number];

/**
 * Respuesta de error, identica en toda la API.
 *
 * 🔴 Lleva `messageKey` y `params`, **nunca prosa**: el idioma lo resuelve el
 * cliente (ADR-005). Un mensaje en español dentro de una respuesta HTTP es un
 * desvio de spec.
 */
export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode;
    messageKey: string;
    params?: Record<string, string | number>;
    /** Lo comparte el usuario con soporte; es la llave para encontrar que paso. */
    requestId: string;
    timestamp: string;
  };
}

/** Los codigos del modulo `SYS`, que puede emitir cualquier capa. */
export const SYS_ERRORS = {
  validation: { code: 'BS-SYS-400-001', status: 400, messageKey: 'errors.system.validation' },
  notFound: { code: 'BS-SYS-404-002', status: 404, messageKey: 'errors.system.notFound' },
  idempotencyMismatch: {
    code: 'BS-SYS-409-003',
    status: 409,
    messageKey: 'errors.system.idempotencyMismatch',
  },
  rateLimited: { code: 'BS-SYS-429-004', status: 429, messageKey: 'errors.system.rateLimited' },
  internal: { code: 'BS-SYS-500-005', status: 500, messageKey: 'errors.system.internal' },
  unavailable: { code: 'BS-SYS-503-006', status: 503, messageKey: 'errors.system.unavailable' },
} as const satisfies Record<string, { code: ErrorCode; status: number; messageKey: string }>;
