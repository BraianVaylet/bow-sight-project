import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildRobots, buildSitemap, PAGES, seoOf, SITE_URL } from './seo.js';

/**
 * Verifica el HTML **prerenderizado**, no el arbol de React.
 *
 * 🔴 Por eso en el CI el build va **antes** de los tests: si corriera al reves,
 * estos se saltearian en silencio y el SSG quedaria sin cubrir — que es
 * exactamente el escenario en el que la landing deja de rankear sin que nadie
 * se entere.
 */
const DIST = resolve(process.cwd(), 'dist');

function html(archivo: string): string {
  try {
    return readFileSync(resolve(DIST, archivo), 'utf8');
  } catch {
    throw new Error(
      `Falta ${archivo}. Corré \`pnpm --filter @bow-sight/landing build\` antes de estos tests.`,
    );
  }
}

describe('metadatos', () => {
  it('cada pagina tiene su titulo y su descripcion, distintos', () => {
    const titulos = new Set(PAGES.map((p) => p.title));
    const descripciones = new Set(PAGES.map((p) => p.description));

    expect(titulos.size).toBe(PAGES.length);
    expect(descripciones.size).toBe(PAGES.length);
    for (const page of PAGES) {
      // Menos de 60 no dice nada; mas de 155 lo corta el buscador igual.
      expect(page.description.length).toBeGreaterThan(60);
      expect(page.description.length).toBeLessThanOrEqual(155);
    }
  });

  it('una ruta desconocida cae en la home, no en undefined', () => {
    expect(seoOf('/no-existe')).toBe(PAGES[0]);
  });

  it('el sitemap deja afuera las legales: no aportan y diluyen', () => {
    const xml = buildSitemap('2026-09-07');
    expect(xml).toContain(`${SITE_URL}/`);
    expect(xml).toContain(`${SITE_URL}/precios`);
    expect(xml).not.toContain('/terminos');
    expect(xml).not.toContain('/privacidad');
  });

  it('el robots apunta al sitemap', () => {
    expect(buildRobots()).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('HTML prerenderizado', () => {
  it('🔴 el contenido esta en el HTML, sin ejecutar JavaScript', () => {
    // Para un buscador, una SPA vacia es una pagina sin contenido.
    const index = html('index.html');
    expect(index).toContain('Las marcas de tu mira, sin el papelito');
    expect(index).toContain('Cómo calcula cada app');
  });

  it('lleva su title, su description y su canonical, una sola vez', () => {
    const index = html('index.html');
    expect(index).toContain(PAGES[0]!.title);
    expect(index).toContain(PAGES[0]!.description);
    expect(index).toContain(`rel="canonical" href="${SITE_URL}/"`);
    // Dos titles serian dos señales distintas para el crawler.
    expect(index.match(/<title/g) ?? []).toHaveLength(1);
  });

  it('cada ruta se prerenderiza con su propio titulo', () => {
    expect(html('precios.html')).toContain('Precios — Bow Sight');
    expect(html('terminos.html')).toContain('Términos de uso');
  });

  it('🔴 la demo de la regla se prerenderiza entera, con sus marcas', () => {
    // Es el argumento de venta: se **ve** que la curva pasa por cada marca, y
    // se ve antes de que cargue un solo kilobyte de JavaScript.
    const index = html('index.html');

    expect(index).toContain('<svg');
    expect(index).toContain('20 m → 4.0');
    expect(index).toContain('60 m → 45.0');
  });

  it('🔴 a 30 m muestra 12.0: exactamente la marca medida', () => {
    // La promesa del producto, verificada en el HTML que ve un visitante.
    expect(html('index.html')).toContain('30 m → 12.0');
  });

  it('el build emite sitemap y robots', () => {
    expect(html('sitemap.xml')).toContain('<urlset');
    expect(html('robots.txt')).toContain('User-agent: *');
  });
});
