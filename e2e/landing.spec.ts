import { expect, test } from '@playwright/test';

/**
 * La landing es el canal de adquisicion: se prueba que **se ve**, y que la demo
 * —el argumento de venta— funciona sin cuenta y sin backend.
 */
test.use({ baseURL: 'http://localhost:5176' });

test('la home explica el producto y ofrece empezar', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(/marcas de tu mira/i);
  await expect(page).toHaveTitle(/Bow Sight/);
});

test('🔴 la demo de la regla pasa exacto por la marca medida, sin API', async ({ page }) => {
  // Es la promesa del producto. Si esto falla, el argumento de venta es falso.
  const llamadasAlBackend: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/api/')) llamadasAlBackend.push(req.url());
  });

  await page.goto('/');

  await expect(page.getByText('30 m → 12.0')).toBeVisible();
  await expect(page.getByText('37 m → 18.1')).toBeVisible();
  expect(llamadasAlBackend).toEqual([]);
});

test('precios muestra los tres planes', async ({ page }) => {
  await page.goto('/precios');

  await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Pro' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Max' })).toBeVisible();
});
