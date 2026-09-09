import { cn } from './cn.js';

/**
 * Un enlace de texto que igual se puede tocar.
 *
 * 🔴 Los 44 px valen para **todo** lo tocable, no solo para los botones. Un
 * "ya tengo cuenta" de 20 px de alto es tan imposible de acertar de pie y con
 * guantes como un boton de 20 px — y encima es el unico camino entre crear
 * cuenta y entrar.
 *
 * Vive aca y no en cada pantalla por la misma razon que `buttonClasses`: una
 * regla copiada en seis lugares se cumple en cinco.
 *
 * Se ve como texto subrayado, no como boton: sigue siendo secundario. Lo que
 * crece es el area, no el peso visual.
 */
export function textLinkClasses(options: { className?: string } = {}): string {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-1 rounded-md underline',
    'text-ink-secondary hover:text-ink transition-colors',
    options.className,
  );
}
