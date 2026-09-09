import { expect, test, type Page } from '@playwright/test';

/**
 * Las tres anchuras del Definition of Done, en claro y en oscuro.
 *
 * 🔴 Se verifica **midiendo**, no mirando una captura. Una captura la mira una
 * persona una vez y despues nadie; esto corre en cada push y falla con el
 * elemento exacto que se desborda.
 *
 * Lo que se busca es lo que de verdad rompe una pantalla angosta: contenido mas
 * ancho que el viewport. En la linea de tiro, un scroll horizontal accidental
 * es la diferencia entre leer la marca y no encontrarla.
 */
const ANCHOS = [
  { nombre: '360 — el telefono mas angosto que importa', width: 360, height: 800 },
  { nombre: '768 — tablet', width: 768, height: 1024 },
  { nombre: '1440 — escritorio', width: 1440, height: 900 },
] as const;

const TEMAS = ['light', 'dark'] as const;

/** Todo lo que sobresale del viewport, con su selector, para poder arreglarlo. */
async function desbordes(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const limite = document.documentElement.clientWidth;
    const culpables: string[] = [];

    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>('*'))) {
      const estilo = getComputedStyle(el);
      if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;
      // Lo que scrollea a proposito puede ser mas ancho que su caja.
      if (estilo.overflowX === 'auto' || estilo.overflowX === 'scroll') continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) continue;

      // 1px de tolerancia: los bordes redondeados y los sub-pixeles no cuentan.
      if (r.right > limite + 1 || r.left < -1) {
        const id = el.id ? `#${el.id}` : '';
        const cls = el.className?.toString().split(/\s+/).slice(0, 3).join('.');
        culpables.push(
          `${el.tagName.toLowerCase()}${id}${cls ? `.${cls}` : ''} ` +
            `[${Math.round(r.left)}..${Math.round(r.right)}] de ${limite}`,
        );
      }
    }
    return culpables.slice(0, 10);
  });
}

/** Alto y ancho de cada cosa tocable. La regla de la casa son 44x44. */
async function tocablesChicos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const selector = 'a, button, input, select, textarea, [role="button"]';
    const chicos: string[] = [];

    for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
      const estilo = getComputedStyle(el);
      if (estilo.display === 'none' || estilo.visibility === 'hidden') continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      // Un enlace dentro de un parrafo es texto, no un control: se mide alto.
      const enLinea = estilo.display === 'inline';
      const alto = Math.round(r.height);
      const ancho = Math.round(r.width);

      if (alto < 44 || (!enLinea && ancho < 44)) {
        const texto = (el.textContent ?? '').trim().slice(0, 24) || el.getAttribute('aria-label');
        chicos.push(`${el.tagName.toLowerCase()} "${texto}" ${ancho}x${alto}`);
      }
    }
    return chicos.slice(0, 10);
  });
}

for (const tema of TEMAS) {
  test.describe(`tema ${tema}`, () => {
    test.use({ colorScheme: tema });

    for (const { nombre, width, height } of ANCHOS) {
      test.describe(nombre, () => {
        test.use({ viewport: { width, height } });

        test('🔴 la landing no scrollea de costado', async ({ page }) => {
          await page.goto('http://localhost:5176/');
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

          const fuera = await desbordes(page);
          expect(fuera, `elementos fuera del viewport:\n${fuera.join('\n')}`).toEqual([]);
        });

        test('la regla entra entera, con sus marcas', async ({ page }) => {
          await page.goto('http://localhost:5176/');

          const svg = page.locator('svg').first();
          await expect(svg).toBeVisible();

          const caja = await svg.boundingBox();
          expect(caja).not.toBeNull();
          expect(caja!.width).toBeLessThanOrEqual(width);
          // La marca mas lejana es la que se sale primero si algo esta mal.
          await expect(page.getByText('60 m → 45.0')).toBeVisible();
        });

        test('precios no scrollea de costado', async ({ page }) => {
          await page.goto('http://localhost:5176/precios');
          await expect(page.getByRole('heading', { name: 'Max' })).toBeVisible();

          const fuera = await desbordes(page);
          expect(fuera, `elementos fuera del viewport:\n${fuera.join('\n')}`).toEqual([]);
        });

        test('🔴 entrar a la PWA no scrollea de costado', async ({ page }) => {
          await page.goto('http://localhost:5173/entrar');
          await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

          const fuera = await desbordes(page);
          expect(fuera, `elementos fuera del viewport:\n${fuera.join('\n')}`).toEqual([]);
        });

        test('crear cuenta no scrollea de costado', async ({ page }) => {
          await page.goto('http://localhost:5173/crear-cuenta');
          await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

          const fuera = await desbordes(page);
          expect(fuera, `elementos fuera del viewport:\n${fuera.join('\n')}`).toEqual([]);
        });
      });
    }
  });
}

test.describe('lo tocable se puede tocar', () => {
  // Solo en el ancho angosto: es donde la app se usa de verdad, de pie y con
  // guantes. En escritorio hay mouse y el problema no existe.
  test.use({ viewport: { width: 360, height: 800 } });

  test('🔴 en la PWA nada tocable baja de 44 px de alto', async ({ page }) => {
    await page.goto('http://localhost:5173/entrar');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    const chicos = await tocablesChicos(page);
    expect(chicos, `controles por debajo de 44 px:\n${chicos.join('\n')}`).toEqual([]);
  });

  test('y tampoco al crear la cuenta', async ({ page }) => {
    await page.goto('http://localhost:5173/crear-cuenta');
    await expect(page.getByRole('heading', { name: 'Crear cuenta' })).toBeVisible();

    const chicos = await tocablesChicos(page);
    expect(chicos, `controles por debajo de 44 px:\n${chicos.join('\n')}`).toEqual([]);
  });
});
