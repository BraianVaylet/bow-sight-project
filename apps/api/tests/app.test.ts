import { describe, expect, it } from 'vitest';
import { appError } from '../src/http/errors.js';
import { REQUEST_ID_HEADER } from '../src/http/requestId.js';
import { makeApp } from './helpers.js';

describe('healthchecks', () => {
  it('/health responde ok mientras el proceso viva', async () => {
    const res = await makeApp().request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ status: 'ok' });
  });

  it('/ready responde 200 solo si la base contesta', async () => {
    const res = await makeApp({ databaseReady: true }).request('/ready');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toMatchObject({ checks: { database: true } });
  });

  it('🔴 /ready responde 503 con la base caida, aunque el proceso viva', async () => {
    // Es la razon por la que el healthcheck de la plataforma apunta aca y no a
    // /health: un servicio que responde pero no puede leer nada no esta listo.
    const res = await makeApp({ databaseReady: false }).request('/ready');
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({
      status: 'degraded',
      checks: { database: false },
    });
  });
});

describe('envelope de error', () => {
  it('una ruta que no existe responde con la forma unica', async () => {
    const res = await makeApp().request('/no-existe');
    expect(res.status).toBe(404);

    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: {
        code: 'BS-SYS-404-002',
        messageKey: 'errors.system.notFound',
        requestId: expect.any(String),
        timestamp: '2026-09-07T12:00:00Z',
      },
    });
  });

  it('un AppError conserva su codigo, su clave y sus params', async () => {
    const app = makeApp();
    app.get('/boom', () => {
      throw appError(
        { code: 'BS-MARK-409-002', status: 409, messageKey: 'errors.mark.outOfScale' },
        { min: 0, max: 60 },
      );
    });

    const res = await app.request('/boom');
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: {
        code: 'BS-MARK-409-002',
        messageKey: 'errors.mark.outOfScale',
        params: { min: 0, max: 60 },
      },
    });
  });

  it('🔴 un error no controlado no filtra nada del original', async () => {
    const app = makeApp();
    app.get('/boom', () => {
      throw new Error('conexion a mongodb://usuario:clave@host fallida');
    });

    const res = await app.request('/boom');
    expect(res.status).toBe(500);

    const raw = await res.text();
    expect(raw).toContain('BS-SYS-500-005');
    // Ni el mensaje, ni el stack, ni la cadena de conexion.
    expect(raw).not.toContain('mongodb');
    expect(raw).not.toContain('clave');
    expect(raw).not.toContain('stack');
  });

  it('🔴 el envelope no lleva prosa en ningun idioma, solo claves', async () => {
    const res = await makeApp().request('/no-existe');
    const body = (await res.json()) as { error: Record<string, unknown> };
    // La API manda claves; el idioma lo resuelve el cliente (ADR-005).
    expect(body.error).not.toHaveProperty('message');
    expect(body.error).not.toHaveProperty('action');
  });
});

describe('requestId', () => {
  it('devuelve un requestId en la respuesta para que el usuario lo comparta', async () => {
    const res = await makeApp().request('/health');
    expect(res.headers.get(REQUEST_ID_HEADER)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('respeta el del cliente para poder seguir una traza que arranco en el navegador', async () => {
    const res = await makeApp().request('/health', {
      headers: { [REQUEST_ID_HEADER]: 'traza-del-navegador' },
    });
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe('traza-del-navegador');
  });

  it('ignora uno absurdamente largo: viene de afuera', async () => {
    const res = await makeApp().request('/health', {
      headers: { [REQUEST_ID_HEADER]: 'x'.repeat(500) },
    });
    expect(res.headers.get(REQUEST_ID_HEADER)).toHaveLength(36);
  });

  it('el mismo requestId del header aparece en el cuerpo del error', async () => {
    const res = await makeApp().request('/no-existe', {
      headers: { [REQUEST_ID_HEADER]: 'abc-123' },
    });
    const body = (await res.json()) as { error: { requestId: string } };
    expect(body.error.requestId).toBe('abc-123');
    expect(res.headers.get(REQUEST_ID_HEADER)).toBe('abc-123');
  });
});

describe('cabeceras de seguridad', () => {
  it('la respuesta de la API nunca se cachea', async () => {
    const res = await makeApp().request('/health');
    expect(res.headers.get('Cache-Control')).toBe('no-store, private');
    expect(res.headers.get('Vary')).toBe('Cookie');
  });

  it('trae las cabeceras de endurecimiento', async () => {
    const res = await makeApp().request('/health');
    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
    expect(res.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
  });
});

describe('robustez de /ready', () => {
  it('si el chequeo de la base explota, responde 503 en vez de 500', async () => {
    // Un healthcheck que se cae con un stack no le sirve a la plataforma:
    // tiene que decir "no estoy listo", no "algo salio mal".
    const { createApp } = await import('../src/app.js');
    const pino = (await import('pino')).default;
    const { testEnv } = await import('./helpers.js');

    const app = createApp({
      env: testEnv(),
      logger: pino({ level: 'silent' }),
      now: () => '2026-09-07T12:00:00Z',
      isDatabaseReady: async () => {
        throw new Error('conexion rechazada');
      },
    });

    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    await expect(res.json()).resolves.toMatchObject({ checks: { database: false } });
  });
});
