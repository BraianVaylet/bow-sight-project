/**
 * Los metadatos de cada pagina, como **dato**.
 *
 * El `sitemap.xml` y el `robots.txt` salen de aca en el build, asi que una
 * pagina nueva no puede quedarse fuera del sitemap por olvido.
 */
export interface PageSeo {
  path: string;
  title: string;
  description: string;
  /** `false` para las legales: no aportan al SEO y diluyen. */
  inSitemap?: boolean;
}

export const SITE_URL = 'https://bowsight.app';

export const PAGES: readonly PageSeo[] = [
  {
    path: '/',
    title: 'Bow Sight — las marcas de tu mira, sin el papelito',
    description:
      'Guarda tus marcas de mira y calcula las distancias que nunca tiraste. El modelo pasa exacto por lo que mediste.',
  },
  {
    path: '/precios',
    title: 'Precios — Bow Sight',
    description: 'Free, Pro y Max desde US$1.99 por mes. Prueba de 14 dias con todo, sin tarjeta.',
  },
  {
    path: '/terminos',
    title: 'Términos — Bow Sight',
    description:
      'Condiciones de uso del servicio: cuenta, suscripcion, cancelacion y responsabilidad.',
    inSitemap: false,
  },
  {
    path: '/privacidad',
    title: 'Privacidad — Bow Sight',
    description:
      'Que datos guardamos, para que los usamos, cuanto duran y como pedir tu copia o tu baja.',
    inSitemap: false,
  },
];

export function seoOf(path: string): PageSeo {
  return PAGES.find((p) => p.path === path) ?? PAGES[0]!;
}

export function buildSitemap(today: string): string {
  const urls = PAGES.filter((p) => p.inSitemap !== false)
    .map((p) => `  <url><loc>${SITE_URL}${p.path}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function buildRobots(): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
}
