import { cn } from './cn.js';

/**
 * Estilo compartido por los tres controles, para que no se separen con el tiempo.
 *
 * El borde usa `border-strong` y no `subtle` porque WCAG 1.4.11 pide 3:1 para el
 * limite de un control: si no se ve donde empieza el campo, no es decoracion.
 */
const CONTROL =
  'min-h-11 w-full rounded-lg border border-border-strong bg-surface-1 px-3 text-base text-ink ' +
  'placeholder:text-ink-muted focus:border-accent disabled:cursor-not-allowed disabled:opacity-50 ' +
  'aria-invalid:border-danger';

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...props }: InputProps) {
  return <input className={cn(CONTROL, 'tnum', className)} {...props} />;
}

export type TextAreaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function TextArea({ className, rows = 3, ...props }: TextAreaProps) {
  return (
    <textarea rows={rows} className={cn(CONTROL, 'py-2 leading-relaxed', className)} {...props} />
  );
}

export type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, ...props }: SelectProps) {
  return <select className={cn(CONTROL, className)} {...props} />;
}
