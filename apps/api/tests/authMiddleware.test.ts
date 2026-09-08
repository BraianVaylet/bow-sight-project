import { Hono } from 'hono';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { requireAuth, requireVerifiedEmail } from '../src/auth/middleware.js';
import type { AppEnv } from '../src/types.js';
import { cookiesOf, startAuthHarness, type AuthHarness } from './authHarness.js';

let h: AuthHarness;

const ARQUERO = { email: 'braian@example.com', password: 'marca-de-mira-30m', name: 'Braian' };

beforeAll(async () => {
  h = await startAuthHarness();
  // Rutas de prueba montadas sobre la misma app, con los guardas reales.
  const auth = h.auth;
  const protegida = new Hono<AppEnv>()
    .use('*', requireAuth(auth))
    .get('/quien-soy', (c) => c.json({ userId: c.get('userId'), plan: c.get('planCode') }))
    .get('/verificado', requireVerifiedEmail, (c) => c.json({ ok: true }))
    // Simula un endpoint mal escrito que intenta leer el usuario del cuerpo.
    .post('/intento-idor', async (c) => {
      const body = (await c.req.json()) as { userId?: string };
      return c.json({ delPedido: body.userId, deLaSesion: c.get('userId') });
    });
  h.app.route('/prueba', protegida);
}, 180_000);

afterAll(async () => {
  await h?.stop();
});

beforeEach(async () => {
  await h.reset();
});

async function sesion() {
  const res = await h.app.request('/api/v1/auth/sign-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(ARQUERO),
  });
  return cookiesOf(res);
}

describe('requireAuth', () => {
  it('sin sesion responde BS-AUTH-401-002 y no deja pasar', async () => {
    const res = await h.app.request('/prueba/quien-soy');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'BS-AUTH-401-002' } });
  });

  it('con una cookie inventada tampoco entra', async () => {
    const res = await h.app.request('/prueba/quien-soy', {
      headers: { cookie: 'bs.session_token=inventado' },
    });
    expect(res.status).toBe(401);
  });

  it('con sesion deja el userId y el plan en el contexto', async () => {
    const cookie = await sesion();
    const res = await h.app.request('/prueba/quien-soy', { headers: { cookie } });

    const body = (await res.json()) as { userId: string; plan: string };
    expect(body.plan).toBe('free');
    expect(body.userId).toBeTruthy();
  });

  it('🔴 el userId de la sesion ignora lo que venga en el cuerpo', async () => {
    // Es la regla que sostiene todo el aislamiento (ADR-000): si el cliente
    // pudiera elegir su userId, el aislamiento seria una sugerencia.
    const cookie = await sesion();
    const res = await h.app.request('/prueba/intento-idor', {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ userId: 'el-de-otro-arquero' }),
    });

    const body = (await res.json()) as { delPedido: string; deLaSesion: string };
    expect(body.delPedido).toBe('el-de-otro-arquero');
    expect(body.deLaSesion).not.toBe('el-de-otro-arquero');
  });
});

describe('requireVerifiedEmail', () => {
  it('🔴 con el email sin verificar responde BS-AUTH-403-003', async () => {
    const cookie = await sesion();
    const res = await h.app.request('/prueba/verificado', { headers: { cookie } });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'BS-AUTH-403-003' } });
  });

  it('con el email verificado pasa', async () => {
    const cookie = await sesion();
    const url = h.mailer.lastTo(ARQUERO.email)?.params['url'];
    await h.app.request(new Request(url!, { redirect: 'manual' }));

    const res = await h.app.request('/prueba/verificado', { headers: { cookie } });
    expect(res.status).toBe(200);
  });

  it('el guarda de verificacion no reemplaza al de sesion: sin sesion, 401', async () => {
    const res = await h.app.request('/prueba/verificado');
    expect(res.status).toBe(401);
  });
});
