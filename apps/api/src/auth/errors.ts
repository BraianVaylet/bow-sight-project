import type { ErrorCode } from '@bow-sight/types';

/**
 * Codigos del modulo `AUTH`, tal como estan declarados en `docs/errors.md`.
 * Declararlos alli es parte del Definition of Ready.
 */
export const AUTH_ERRORS = {
  invalidCredentials: {
    code: 'BS-AUTH-401-001',
    status: 401,
    messageKey: 'errors.auth.invalidCredentials',
  },
  sessionExpired: {
    code: 'BS-AUTH-401-002',
    status: 401,
    messageKey: 'errors.auth.sessionExpired',
  },
  emailNotVerified: {
    code: 'BS-AUTH-403-003',
    status: 403,
    messageKey: 'errors.auth.emailNotVerified',
  },
  emailTaken: { code: 'BS-AUTH-409-004', status: 409, messageKey: 'errors.auth.emailTaken' },
  tooManyAttempts: {
    code: 'BS-AUTH-429-005',
    status: 429,
    messageKey: 'errors.auth.tooManyAttempts',
  },
  badToken: { code: 'BS-AUTH-400-006', status: 400, messageKey: 'errors.auth.badToken' },
  badResetToken: {
    code: 'BS-AUTH-400-007',
    status: 400,
    messageKey: 'errors.auth.badResetToken',
  },
} as const satisfies Record<string, { code: ErrorCode; status: number; messageKey: string }>;

/**
 * Traduce el error de Better Auth a uno nuestro.
 *
 * 🔴 Un email ya registrado y una contraseña incorrecta **responden distinto a
 * proposito**: el primero es un conflicto al crear, el segundo no puede revelar
 * si el email existe. Por eso `invalidCredentials` es el default de todo 401 y
 * de todo 404 de login, sin importar que dijo el proveedor.
 */
export function mapAuthError(status: number, providerCode: string | undefined) {
  const code = (providerCode ?? '').toUpperCase();

  if (code.includes('ALREADY_EXISTS') || code.includes('EXISTING_EMAIL')) {
    return AUTH_ERRORS.emailTaken;
  }
  if (code.includes('EMAIL_NOT_VERIFIED')) return AUTH_ERRORS.emailNotVerified;
  if (code.includes('INVALID_TOKEN') || code.includes('TOKEN_EXPIRED')) return AUTH_ERRORS.badToken;
  if (code.includes('PASSWORD_RESET')) return AUTH_ERRORS.badResetToken;
  if (status === 429) return AUTH_ERRORS.tooManyAttempts;
  if (status === 401 || status === 404) return AUTH_ERRORS.invalidCredentials;

  return AUTH_ERRORS.invalidCredentials;
}
