import { expect, test, type Page } from '@playwright/test';

/**
 * El camino que **es** el producto: cargar marcas y preguntar por una distancia
 * que nunca se tiro.
 *
 * 🔴 Las cinco marcas son las del autor, en centimetros, como estaban en la app
 * vieja. Que el calculo devuelva exactamente `12.0` a 30 m no es un detalle del
 * test: es la promesa del producto (ADR-001). Si eso deja de pasar, lo que nos
 * diferencia dejo de ser cierto.
 */
const MARCAS: [distancia: number, cm: number][] = [
  [20, 4.1],
  [30, 12],
  [40, 21],
  [50, 32],
  [60, 45],
];

function emailNuevo(): string {
  return `arquero-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

async function entrarConCuentaNueva(page: Page): Promise<void> {
  await page.goto('/crear-cuenta');
  await page.getByLabel(/nombre/i).fill('Braian');
  await page.getByLabel(/email/i).fill(emailNuevo());
  await page.getByLabel(/contraseña/i).fill('una-frase-que-me-acuerdo');
  await page.getByRole('button', { name: 'Crear cuenta' }).click();
  await expect(page.getByRole('heading', { name: 'Mis miras' })).toBeVisible();
}

async function crearSetDeFlechas(page: Page, nombre = 'X10 450'): Promise<void> {
  await page.goto('/equipo');
  await page.getByLabel(/nombre del set/i).fill(nombre);
  await page.getByRole('button', { name: 'Agregar set' }).click();
  await expect(page.getByText(nombre)).toBeVisible();
}

async function crearMira(page: Page, nombre = 'Shibuya'): Promise<void> {
  await page.goto('/miras/nueva');
  await page.getByLabel('Nombre').fill(nombre);
  await page.getByRole('button', { name: 'Crear mira' }).click();
  await expect(page.getByRole('heading', { name: nombre })).toBeVisible();
}

async function anotar(page: Page, distancia: number, cm: number): Promise<void> {
  await page.getByLabel('Distancia (m)').last().fill(String(distancia));
  await page.getByLabel('Marca (cm)').fill(String(cm));
  await page.getByRole('button', { name: 'Anotar' }).click();
  await expect(page.getByText(`${distancia} m → ${cm.toFixed(1)} cm`)).toBeVisible();
}

test('🔴 el camino completo: de cuenta nueva a una marca calculada', async ({ page }) => {
  await entrarConCuentaNueva(page);
  await crearSetDeFlechas(page);
  await crearMira(page);

  // Con menos de cinco, la app dice cuantas faltan en vez de dibujar una curva
  // que no significa nada.
  await expect(page.getByText(/te faltan 5 marca/i)).toBeVisible();

  for (const [distancia, cm] of MARCAS) await anotar(page, distancia, cm);

  await expect(page.getByText('Marcas medidas')).toBeVisible();
  await expect(page.getByText(/te faltan/i)).toBeHidden();

  // 🔴 La promesa: a una distancia **medida**, el modelo devuelve exactamente lo
  // que el arquero cargo. Ni redondeado ni ajustado.
  await page.getByLabel('Distancia (m)').first().fill('30');
  await expect(page.getByText('12.0 cm')).toBeVisible();
  await expect(page.getByText('entre marcas tuyas')).toBeVisible();

  // Entre dos marcas: interpolada, sin `≈`.
  await page.getByLabel('Distancia (m)').first().fill('35');
  await expect(page.getByText('entre marcas tuyas')).toBeVisible();

  // Fuera del rango medido: estimada, y lo dice.
  await page.getByLabel('Distancia (m)').first().fill('70');
  await expect(page.getByText(/estimada fuera de lo que mediste/i)).toBeVisible();
});

test('la mira sobrevive a recargar: las marcas estan en el servidor', async ({ page }) => {
  await entrarConCuentaNueva(page);
  await crearSetDeFlechas(page);
  await crearMira(page);
  await anotar(page, 30, 12);

  await page.reload();

  await expect(page.getByText('30 m → 12.0 cm')).toBeVisible();
});

test('🔴 sin un set de flechas, la app lo dice en vez de fallar al guardar', async ({ page }) => {
  // Una marca pertenece a un set. Dejar anotar y fallar despues seria hacerle
  // escribir dos numeros para nada.
  await entrarConCuentaNueva(page);
  await crearMira(page);

  await expect(page.getByText(/necesitas un set de flechas/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Anotar' })).toBeDisabled();
});

test('borrar una marca la saca de la lista', async ({ page }) => {
  await entrarConCuentaNueva(page);
  await crearSetDeFlechas(page);
  await crearMira(page);
  await anotar(page, 30, 12);

  await page.getByRole('button', { name: /borrar la marca de 30 metros/i }).click();

  await expect(page.getByText('30 m → 12.0 cm')).toBeHidden();
});

test('🔴 "nueva" no se confunde con el id de una mira', async ({ page }) => {
  // Con las rutas al reves, /miras/nueva se leeria como un id y la pantalla
  // pediria una mira que no existe.
  await entrarConCuentaNueva(page);
  await page.goto('/miras/nueva');

  await expect(page.getByRole('heading', { name: 'Nueva mira' })).toBeVisible();
});
