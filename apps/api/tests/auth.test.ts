import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookiesOf, startAuthHarness, tokenFromUrl, type AuthHarness } from './authHarness.js';

let h: AuthHarness;

const ARQUERO = {
  email: 'braian@example.com',
  password: 'marca-de-mira-30m',
  name: 'Braian',
};

beforeAll(async () => {
  h = await startAuthHarness();
}, 180_000);

afterAll(async () => {
  await h?.stop();
});

beforeEach(async () => {
  await h.reset();
});

function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  return h.app.request(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
}

async function signUp(overrides: Partial<typeof ARQUERO> & { locale?: string } = {}) {
  return post('/api/v1/auth/sign-up', { ...ARQUERO, ...overrides });
}

describe('alta de cuenta', () => {
  it('crea la cuenta, manda el mail de verificacion y la deja sin verificar', async () => {
    const res = await signUp();
    expect(res.status).toBe(201);

    const mail = h.mailer.lastTo(ARQUERO.email);
    expect(mail?.template).toBe('verifyEmail');
    expect(mail?.params['url']).toBeTruthy();

    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookiesOf(res) } });
    await expect(me.json()).resolves.toMatchObject({
      email: ARQUERO.email,
      emailVerified: false,
      planCode: 'free',
    });
  });

  it('🔴 el mail sale en el idioma del usuario, no en el del pedido', async () => {
    await signUp({ email: 'archer@example.com', locale: 'en' });
    expect(h.mailer.lastTo('archer@example.com')?.locale).toBe('en');

    await signUp({ email: 'arquero@example.com', locale: 'es' });
    expect(h.mailer.lastTo('arquero@example.com')?.locale).toBe('es');
  });

  it('un email ya registrado responde BS-AUTH-409-004', async () => {
    await signUp();
    const res = await signUp();

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      success: false,
      error: { code: 'BS-AUTH-409-004', messageKey: 'errors.auth.emailTaken' },
    });
  });

  it('🔴 el plan no se puede elegir desde el pedido', async () => {
    // Si `planCode` fuera de entrada, cualquiera se pondria en `max`.
    const res = await post('/api/v1/auth/sign-up', { ...ARQUERO, planCode: 'max' });
    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookiesOf(res) } });
    await expect(me.json()).resolves.toMatchObject({ planCode: 'free' });
  });

  it('rechaza una contraseña corta con el error de validacion', async () => {
    const res = await signUp({ password: 'corta' });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'BS-SYS-400-001' } });
  });

  it('normaliza el email a minusculas: es la misma persona', async () => {
    await signUp();
    const res = await signUp({ email: 'Braian@Example.com' });
    expect(res.status).toBe(409);
  });
});

describe('ingreso', () => {
  beforeEach(async () => {
    await signUp();
  });

  it('con las credenciales correctas devuelve una sesion utilizable', async () => {
    const res = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: ARQUERO.password,
    });
    expect(res.status).toBe(200);

    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookiesOf(res) } });
    expect(me.status).toBe(200);
  });

  it('🔴 una contraseña incorrecta y un email inexistente responden identico', async () => {
    // Si respondieran distinto, este endpoint seria un buscador de cuentas.
    const malaClave = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: 'otra-clave-larga-1',
    });
    const noExiste = await post('/api/v1/auth/sign-in', {
      email: 'nadie@example.com',
      password: 'otra-clave-larga-1',
    });

    expect(malaClave.status).toBe(noExiste.status);
    expect(await malaClave.json()).toMatchObject({ error: { code: 'BS-AUTH-401-001' } });
    expect(await noExiste.json()).toMatchObject({ error: { code: 'BS-AUTH-401-001' } });
  });

  it('sin sesion, /me responde BS-AUTH-401-002', async () => {
    const res = await h.app.request('/api/v1/auth/me');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: { code: 'BS-AUTH-401-002' } });
  });

  it('cerrar sesion la invalida', async () => {
    const entrada = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: ARQUERO.password,
    });
    const cookie = cookiesOf(entrada);

    await post('/api/v1/auth/sign-out', {}, { cookie });
    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie } });
    expect(me.status).toBe(401);
  });
});

describe('cookie de sesion', () => {
  it('🔴 es httpOnly y SameSite=Lax, no Strict', async () => {
    const res = await signUp();
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token'));

    expect(cookie, 'no salio la cookie de sesion').toBeTruthy();
    // httpOnly: fuera del alcance de cualquier XSS.
    expect(cookie).toMatch(/HttpOnly/i);
    // 🔴 Lax y no Strict: con Strict, el navegador no manda la cookie al volver
    // de Stripe Checkout ni del back_url de Mercado Pago, y el arquero aterriza
    // deslogueado creyendo que el pago fallo (ADR-003).
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect(cookie).toMatch(/Path=\//i);
  });

  it('en dev no exige HTTPS: si no, no se puede probar en localhost', async () => {
    const res = await signUp();
    const cookie = res.headers.getSetCookie().find((c) => c.includes('session_token'));
    expect(cookie).not.toMatch(/Secure/i);
  });
});

describe('verificacion de email', () => {
  it('el enlace del mail deja la cuenta verificada', async () => {
    const alta = await signUp();
    const url = h.mailer.lastTo(ARQUERO.email)?.params['url'];
    expect(url).toBeTruthy();

    const verificacion = await h.app.request(new Request(url!, { redirect: 'manual' }));

    // 🔴 Redirige a la PWA, no devuelve JSON: el arquero llega desde su cliente
    // de correo y tiene que terminar en una pantalla.
    expect(verificacion.status).toBe(302);
    expect(verificacion.headers.get('location')).toContain('/email-verificado?estado=ok');

    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookiesOf(alta) } });
    await expect(me.json()).resolves.toMatchObject({ emailVerified: true });
  });

  it('🔴 el enlace del mail apunta a una ruta que existe', async () => {
    // Regresion: apuntaba a la ruta por defecto de Better Auth, que no esta
    // montada porque las de auth van envueltas en nuestro envelope. El mail
    // llevaba a un 404 y la cuenta no se podia verificar nunca.
    await signUp();
    const url = h.mailer.lastTo(ARQUERO.email)?.params['url'];

    expect(url).toContain('/api/v1/auth/verify-email');
    const res = await h.app.request(new Request(url!, { redirect: 'manual' }));
    expect(res.status).not.toBe(404);
  });

  it('un token invalido no verifica nada y no dice por que fallo', async () => {
    const alta = await signUp();
    const res = await h.app.request('/api/v1/auth/verify-email?token=basura', {
      redirect: 'manual',
    });

    // Un token vencido y uno inventado se ven igual desde afuera.
    expect(res.headers.get('location')).toContain('estado=invalido');

    const me = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookiesOf(alta) } });
    await expect(me.json()).resolves.toMatchObject({ emailVerified: false });
  });

  it('sin token, redirige al mismo lugar que con uno invalido', async () => {
    const res = await h.app.request('/api/v1/auth/verify-email', { redirect: 'manual' });
    expect(res.headers.get('location')).toContain('estado=invalido');
  });
});

describe('reset de contraseña', () => {
  beforeEach(async () => {
    await signUp();
  });

  it('🔴 pedir el reset responde 204 exista o no el email', async () => {
    // Responder distinto convertiria este endpoint en un buscador de cuentas.
    const existe = await post('/api/v1/auth/password-reset/request', { email: ARQUERO.email });
    const noExiste = await post('/api/v1/auth/password-reset/request', {
      email: 'nadie@example.com',
    });

    expect(existe.status).toBe(204);
    expect(noExiste.status).toBe(204);
    // Y al que no existe no le llega ningun mail.
    expect(h.mailer.lastTo('nadie@example.com')).toBeUndefined();
  });

  it('el mail de reset llega con su enlace', async () => {
    await post('/api/v1/auth/password-reset/request', { email: ARQUERO.email });
    const mail = h.mailer.lastTo(ARQUERO.email);
    expect(mail?.template).toBe('resetPassword');
    expect(mail?.params['url']).toBeTruthy();
  });

  it('🔴 cambiar la contraseña invalida TODAS las sesiones anteriores', async () => {
    // Si alguien la cambia porque le entraron, el intruso tiene que quedar afuera.
    const sesionVieja = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: ARQUERO.password,
    });
    const cookieVieja = cookiesOf(sesionVieja);
    expect(
      (await h.app.request('/api/v1/auth/me', { headers: { cookie: cookieVieja } })).status,
    ).toBe(200);

    await post('/api/v1/auth/password-reset/request', { email: ARQUERO.email });
    const token = tokenFromUrl(h.mailer.lastTo(ARQUERO.email)?.params['url']);

    const reset = await post('/api/v1/auth/password-reset/confirm', {
      token,
      newPassword: 'una-clave-nueva-larga',
    });
    expect(reset.status).toBe(204);

    const despues = await h.app.request('/api/v1/auth/me', { headers: { cookie: cookieVieja } });
    expect(despues.status).toBe(401);
  });

  it('despues del reset, la contraseña vieja ya no entra y la nueva si', async () => {
    await post('/api/v1/auth/password-reset/request', { email: ARQUERO.email });
    const token = tokenFromUrl(h.mailer.lastTo(ARQUERO.email)?.params['url']);
    await post('/api/v1/auth/password-reset/confirm', {
      token,
      newPassword: 'una-clave-nueva-larga',
    });

    const vieja = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: ARQUERO.password,
    });
    expect(vieja.status).toBe(401);

    const nueva = await post('/api/v1/auth/sign-in', {
      email: ARQUERO.email,
      password: 'una-clave-nueva-larga',
    });
    expect(nueva.status).toBe(200);
  });

  it('un token de reset invalido responde con su codigo, no con un 500', async () => {
    const res = await post('/api/v1/auth/password-reset/confirm', {
      token: 'no-es-un-token',
      newPassword: 'una-clave-nueva-larga',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    await expect(res.json()).resolves.toMatchObject({ success: false });
  });
});
