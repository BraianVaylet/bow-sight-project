import { expect, test } from '@playwright/test';

/**
 * El camino de entrada, de punta a punta: navegador → PWA → API → Mongo.
 *
 * Es el unico camino que hoy existe completo. Los otros dos criticos —cargar
 * marcas y ver una calculada, e imprimir el tape— llegan con F1, y sus specs
 * se suman aca.
 */

/** Cada corrida usa un email propio: la base es efimera pero se comparte. */
function emailNuevo(): string {
  return `arquero-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

test('crear cuenta deja al arquero adentro, con su lista vacia', async ({ page }) => {
  await page.goto('/crear-cuenta');

  await page.getByLabel(/nombre/i).fill('Braian');
  await page.getByLabel(/email/i).fill(emailNuevo());
  await page.getByLabel(/contraseña/i).fill('una-frase-que-me-acuerdo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();

  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();
  await expect(page.getByText(/todavía no tenés miras/i)).toBeVisible();
});

test('la sesion sobrevive a recargar: la cookie es del servidor, no del tab', async ({ page }) => {
  await page.goto('/crear-cuenta');
  await page.getByLabel(/nombre/i).fill('Braian');
  await page.getByLabel(/email/i).fill(emailNuevo());
  await page.getByLabel(/contraseña/i).fill('una-frase-que-me-acuerdo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();
});

test('🔴 sin sesion, la lista de miras no se ve: manda a entrar', async ({ page }) => {
  await page.context().clearCookies();
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeHidden();
});

test('entrar con la clave equivocada no dice si el email existe', async ({ page }) => {
  const email = emailNuevo();

  await page.goto('/crear-cuenta');
  await page.getByLabel(/nombre/i).fill('Braian');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill('una-frase-que-me-acuerdo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();
  await page.context().clearCookies();

  // La cuenta existe y la clave esta mal.
  await page.goto('/entrar');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill('esta-no-es-la-clave');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const conCuenta = await page.getByRole('alert').textContent();

  // La cuenta no existe.
  await page.goto('/entrar');
  await page.getByLabel(/email/i).fill(emailNuevo());
  await page.getByLabel(/contraseña/i).fill('esta-no-es-la-clave');
  await page.getByRole('button', { name: 'Entrar' }).click();
  const sinCuenta = await page.getByRole('alert').textContent();

  // Si dijeran cosas distintas, esta pantalla seria un buscador de cuentas.
  expect(conCuenta).toBe(sinCuenta);
});

test('crear cuenta manda el mail de verificacion', async ({ page, request }) => {
  const email = emailNuevo();

  await page.goto('/crear-cuenta');
  await page.getByLabel(/nombre/i).fill('Braian');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/contraseña/i).fill('una-frase-que-me-acuerdo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();

  const mails = await (await request.get('http://localhost:3000/e2e/mails')).json();
  const suyo = mails.filter((m: { to: string }) => m.to === email);

  expect(suyo).toHaveLength(1);
  // 🔴 El enlace apunta a NUESTRA ruta, no a la de Better Auth: la de Better
  // Auth no esta montada, y un mail que lleva a un 404 deja la cuenta sin
  // verificar para siempre.
  expect(JSON.stringify(suyo[0])).toContain('/api/v1/auth/verify-email');
});
