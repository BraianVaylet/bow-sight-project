import { ThemeProvider } from '@bow-sight/ui';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Head } from 'vite-react-ssg';
import { seoOf, SITE_URL } from './seo.js';

export function Layout() {
  const { pathname } = useLocation();
  const seo = seoOf(pathname);

  return (
    <ThemeProvider>
      {/* Los meta salen del build: es lo que hace que la pagina rankee. */}
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <link rel="canonical" href={`${SITE_URL}${seo.path}`} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
        <meta property="og:url" content={`${SITE_URL}${seo.path}`} />
        <meta property="og:type" content="website" />
      </Head>

      <div className="bg-surface-0 min-h-dvh">
        <header className="border-border-subtle border-b">
          <nav className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
            <Link to="/" className="text-ink font-semibold">
              Bow Sight
            </Link>
            <Link to="/precios" className="text-ink-secondary text-sm underline">
              Precios
            </Link>
          </nav>
        </header>

        <Outlet />

        <footer className="border-border-subtle border-t">
          <div className="text-ink-muted mx-auto flex max-w-4xl flex-wrap gap-4 px-4 py-8 text-sm">
            <Link to="/terminos" className="underline">
              Términos
            </Link>
            <Link to="/privacidad" className="underline">
              Privacidad
            </Link>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
