import { describe, expect, it, vi } from 'vitest';
import { createApiClient } from './api/client.js';
import { ApiError } from './api/errors.js';

const ENVELOPE = {
  success: false,
  error: {
    code: 'BS-MARK-409-002',
    messageKey: 'errors.mark.outOfScale',
    params: { min: 0, max: 600 },
    requestId: 'req-1',
    timestamp: '2026-09-07T12:00:00Z',
  },
};

function client(fetchImpl: typeof fetch) {
  return createApiClient({ baseUrl: '/api/v1', fetchImpl });
}

describe('cliente de API', () => {
  it('manda las credenciales: la sesion vive en una cookie httpOnly', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    await client(fetchImpl as unknown as typeof fetch).get('/sights');

    const [, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(init.credentials).toBe('include');
  });

  it('un 204 no intenta parsear un cuerpo que no existe', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));
    await expect(
      client(fetchImpl as unknown as typeof fetch).delete('/sights/x'),
    ).resolves.toBeUndefined();
  });

  it('🔴 desarma el envelope conservando la clave y los params, sin inventar prosa', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify(ENVELOPE), { status: 409 }));

    await expect(client(fetchImpl as unknown as typeof fetch).get('/x')).rejects.toMatchObject({
      code: 'BS-MARK-409-002',
      messageKey: 'errors.mark.outOfScale',
      params: { min: 0, max: 600 },
      requestId: 'req-1',
      status: 409,
    });
  });

  it('sin red devuelve un error distinguible, no un 500 inventado', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new TypeError('failed to fetch');
    });

    const error = await client(fetchImpl as unknown as typeof fetch)
      .get('/x')
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('NETWORK');
    expect((error as ApiError).status).toBe(0);
  });

  it('una respuesta rota no se hace pasar por otra cosa', async () => {
    const fetchImpl = vi.fn(async () => new Response('no soy json', { status: 500 }));
    await expect(client(fetchImpl as unknown as typeof fetch).get('/x')).rejects.toMatchObject({
      code: 'BS-SYS-500-005',
    });
  });

  it('la clave de idempotencia viaja solo cuando se la pasa', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }));
    const api = client(fetchImpl as unknown as typeof fetch);

    await api.post('/marks', { x: 1 }, 'clave-1');
    await api.post('/marks', { x: 2 });

    const headers = fetchImpl.mock.calls.map(
      (c) => (c as unknown as [string, RequestInit])[1].headers as Record<string, string>,
    );
    expect(headers[0]?.['idempotency-key']).toBe('clave-1');
    expect(headers[1]?.['idempotency-key']).toBeUndefined();
  });
});
