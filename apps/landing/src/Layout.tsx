import { textLinkClasses, ThemeProvider } from '@bow-sight/ui';
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
            <Link
              to="/"
              className={textLinkClasses({ className: 'text-ink font-semibold no-underline' })}
            >
              Bow Sight
            </Link>
            <Link to="/precios" className={textLinkClasses({ className: 'text-sm' })}>
              Precios
            </Link>
          </nav>
        </header>

        <Outlet />

        <footer className="border-border-subtle border-t">
          <div className="text-ink-muted mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-4 py-4 text-sm">
            <Link to="/terminos" className={textLinkClasses()}>
              Términos
            </Link>
            <Link to="/privacidad" className={textLinkClasses()}>
              Privacidad
            </Link>
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}
