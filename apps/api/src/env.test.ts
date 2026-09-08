import { describe, expect, it, vi } from 'vitest';
import { loadEnv } from './env.js';

describe('loadEnv', () => {
  it('devuelve el entorno cuando esta completo', () => {
    expect(loadEnv({ APP_ENV: 'dev', PORT: '4000' }).PORT).toBe(4000);
  });

  it('🔴 corta el proceso si falta configuracion, y dice todo lo que falta', () => {
    // Es deliberado: preferimos que el deploy no levante a que levante y
    // explote a las 3 de la mañana con un `undefined`.
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => loadEnv({ APP_ENV: 'prod' })).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);

    const mensaje = String(error.mock.calls[0]?.[0]);
    expect(mensaje).toContain('MONGODB_URI');
    expect(mensaje).toContain('BETTER_AUTH_SECRET');

    exit.mockRestore();
    error.mockRestore();
  });
});
