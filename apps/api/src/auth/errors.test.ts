import { describe, expect, it } from 'vitest';
import { AUTH_ERRORS, mapAuthError } from './errors.js';

describe('mapAuthError', () => {
  it('un email ya registrado es un conflicto al crear', () => {
    expect(mapAuthError(422, 'USER_ALREADY_EXISTS')).toBe(AUTH_ERRORS.emailTaken);
    expect(mapAuthError(400, 'EXISTING_EMAIL')).toBe(AUTH_ERRORS.emailTaken);
  });

  it('🔴 todo 401 y todo 404 salen como credenciales invalidas', () => {
    // No puede revelar si el email existe: si respondiera distinto, el login
    // seria un buscador de cuentas.
    expect(mapAuthError(401, 'INVALID_PASSWORD')).toBe(AUTH_ERRORS.invalidCredentials);
    expect(mapAuthError(404, 'USER_NOT_FOUND')).toBe(AUTH_ERRORS.invalidCredentials);
    expect(mapAuthError(401, undefined)).toBe(AUTH_ERRORS.invalidCredentials);
  });

  it('el email sin verificar tiene su propio codigo', () => {
    expect(mapAuthError(403, 'EMAIL_NOT_VERIFIED')).toBe(AUTH_ERRORS.emailNotVerified);
  });

  it('los tokens vencidos e invalidos se distinguen del resto', () => {
    expect(mapAuthError(400, 'INVALID_TOKEN')).toBe(AUTH_ERRORS.badToken);
    expect(mapAuthError(400, 'TOKEN_EXPIRED')).toBe(AUTH_ERRORS.badToken);
    expect(mapAuthError(400, 'INVALID_PASSWORD_RESET_TOKEN')).toBe(AUTH_ERRORS.badResetToken);
  });

  it('un 429 del proveedor se traduce a demasiados intentos', () => {
    expect(mapAuthError(429, undefined)).toBe(AUTH_ERRORS.tooManyAttempts);
  });

  it('lo desconocido cae en credenciales invalidas, no en un 500', () => {
    // Ante la duda, el error menos informativo: nunca filtrar de mas.
    expect(mapAuthError(500, 'ALGO_RARO')).toBe(AUTH_ERRORS.invalidCredentials);
  });

  it('los codigos coinciden con docs/errors.md', () => {
    expect(AUTH_ERRORS.invalidCredentials.code).toBe('BS-AUTH-401-001');
    expect(AUTH_ERRORS.sessionExpired.code).toBe('BS-AUTH-401-002');
    expect(AUTH_ERRORS.emailNotVerified.code).toBe('BS-AUTH-403-003');
    expect(AUTH_ERRORS.emailTaken.code).toBe('BS-AUTH-409-004');
    expect(AUTH_ERRORS.tooManyAttempts.code).toBe('BS-AUTH-429-005');
    expect(AUTH_ERRORS.badToken.code).toBe('BS-AUTH-400-006');
    expect(AUTH_ERRORS.badResetToken.code).toBe('BS-AUTH-400-007');
  });
});
