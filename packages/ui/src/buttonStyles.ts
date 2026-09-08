import { cn } from './cn.js';

export type ButtonTone = 'accent' | 'neutral' | 'danger' | 'ghost';
export type ButtonSize = 'md' | 'lg';

const TONES: Record<ButtonTone, string> = {
  accent: 'bg-accent text-accent-ink hover:bg-accent-strong',
  neutral: 'bg-surface-2 text-ink border border-border-subtle hover:border-border-strong',
  danger: 'bg-danger text-white hover:opacity-90',
  ghost: 'bg-transparent text-ink-secondary hover:bg-surface-2 hover:text-ink',
};

// 44px de alto minimo: se toca de pie, con guantes y apurado entre dos tandas.
const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-11 px-4 text-sm',
  lg: 'min-h-13 px-5 text-base',
};

/**
 * Las clases del boton, para que un **enlace** pueda verse igual.
 *
 * 🔴 Un elemento que navega tiene que ser un `<a>`, no un `<button>` con un
 * `onClick`: si no, se pierde el "abrir en otra pestaña", el menu contextual y
 * el anuncio correcto del lector de pantalla. Se comparte el estilo, no el rol.
 */
export function buttonClasses(
  options: { tone?: ButtonTone; size?: ButtonSize; block?: boolean; className?: string } = {},
): string {
  const { tone = 'neutral', size = 'md', block = false, className } = options;
  return cn(
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
    'disabled:cursor-not-allowed disabled:opacity-50',
    TONES[tone],
    SIZES[size],
    block && 'w-full',
    className,
  );
}
