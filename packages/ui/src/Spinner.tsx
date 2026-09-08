import { cn } from './cn.js';

export interface SpinnerProps {
  className?: string;
  /** Que esta cargando. Va al lector de pantalla, no a la vista. */
  label?: string;
}

export function Spinner({ className, label = 'Cargando' }: SpinnerProps) {
  return (
    <span role="status" aria-live="polite" className={cn('inline-flex items-center', className)}>
      <svg
        className="text-ink-muted size-5 animate-spin"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}
