import { SYS_ERRORS } from '@bow-sight/types';
import { describe, expect, it } from 'vitest';
import {
  AppError,
  appError,
  notFoundError,
  rateLimitedError,
  unavailableError,
  validationError,
} from './errors.js';

describe('AppError', () => {
  it('lleva codigo, clave y status, no prosa', () => {
    const err = appError(SYS_ERRORS.validation, { field: 'distanceM' });

    expect(err).toBeInstanceOf(AppError);
    expect(err.code).toBe('BS-SYS-400-001');
    expect(err.messageKey).toBe('errors.system.validation');
    expect(err.status).toBe(400);
    expect(err.params).toEqual({ field: 'distanceM' });
  });

  it('el message es para el log, no para el usuario', () => {
    // Un mensaje legible aca tentaria a mostrarlo, y estaria en un solo idioma.
    expect(notFoundError().message).toBe('BS-SYS-404-002 errors.system.notFound');
  });

  it('sin params, la propiedad queda indefinida y el envelope no la incluye', () => {
    expect(validationError().params).toBeUndefined();
  });

  it('los atajos apuntan al codigo correcto del diccionario', () => {
    expect(rateLimitedError().status).toBe(429);
    expect(rateLimitedError().code).toBe('BS-SYS-429-004');
    expect(unavailableError().code).toBe('BS-SYS-503-006');
  });
});
