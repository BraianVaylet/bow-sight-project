import { cn } from './cn.js';

export type AlertTone = 'danger' | 'warning' | 'info';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: AlertTone;
  /**
   * El codigo de error, para que el usuario pueda compartirlo con soporte.
   *
   * Explicitamente `| undefined`: con `exactOptionalPropertyTypes` no es lo
   * mismo que `?`, y quien lo pasa suele tenerlo en una variable opcional.
   */
  code?: string | undefined;
}

const TONES: Record<AlertTone, string> = {
  danger: 'bg-danger-soft text-danger border-danger/30',
  warning: 'bg-surface-2 text-ink border-warning/40',
  info: 'bg-accent-soft text-ink border-accent/30',
};

export function Alert({ tone = 'danger', code, className, children, ...props }: AlertProps) {
  return (
    <div
      // `alert` interrumpe al lector de pantalla; para lo informativo alcanza
      // con `status`, que espera a que termine de leer lo que estaba leyendo.
      role={tone === 'info' ? 'status' : 'alert'}
      className={cn('rounded-lg border px-3 py-2 text-sm', TONES[tone], className)}
      {...props}
    >
      {children}
      {code ? <span className="mt-1 block font-mono text-xs opacity-70">{code}</span> : null}
    </div>
  );
}
