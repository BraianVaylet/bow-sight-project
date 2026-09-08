import { Writable } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { createLogger } from './logger.js';

/** Captura las lineas JSON que escribe pino. */
function capture() {
  const lines: Record<string, unknown>[] = [];
  const stream = new Writable({
    write(chunk, _enc, cb) {
      lines.push(JSON.parse(String(chunk)));
      cb();
    },
  });
  return { lines, stream };
}

describe('logger', () => {
  it('escribe el formato de la spec: ts, env, service', () => {
    const { lines, stream } = capture();
    const logger = createLogger({ APP_ENV: 'test', LOG_LEVEL: 'info' }, stream);

    logger.info({ module: 'marks', action: 'createMark', requestId: 'r-1' }, 'mark created');

    expect(lines[0]).toMatchObject({
      env: 'test',
      service: 'api',
      module: 'marks',
      action: 'createMark',
      requestId: 'r-1',
      msg: 'mark created',
    });
    // El timestamp sale de Temporal, no de `Date`.
    expect(lines[0]?.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('🔴 nunca escribe una contraseña ni un token, tampoco dentro de meta', () => {
    const { lines, stream } = capture();
    const logger = createLogger({ APP_ENV: 'test', LOG_LEVEL: 'info' }, stream);

    logger.info(
      {
        password: 'la-clave-del-arquero',
        token: 'bs_live_secreto',
        meta: { password: 'otra-clave', token: 'otro-token' },
      },
      'intento de login',
    );

    const raw = JSON.stringify(lines[0]);
    expect(raw).not.toContain('la-clave-del-arquero');
    expect(raw).not.toContain('bs_live_secreto');
    expect(raw).not.toContain('otra-clave');
    expect(raw).not.toContain('otro-token');
    expect(raw).toContain('[redactado]');
  });

  it('🔴 no escribe la cookie de sesion ni el authorization del pedido', () => {
    const { lines, stream } = capture();
    const logger = createLogger({ APP_ENV: 'test', LOG_LEVEL: 'info' }, stream);

    logger.info(
      { req: { headers: { cookie: 'bs_session=abc123', authorization: 'Bearer xyz' } } },
      'pedido',
    );

    const raw = JSON.stringify(lines[0]);
    expect(raw).not.toContain('abc123');
    expect(raw).not.toContain('Bearer xyz');
  });

  it('respeta el nivel configurado', () => {
    const { lines, stream } = capture();
    const logger = createLogger({ APP_ENV: 'prod', LOG_LEVEL: 'warn' }, stream);

    logger.info({}, 'no deberia salir');
    logger.warn({}, 'esto si');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.msg).toBe('esto si');
  });
});
