import { cn } from './cn.js';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Punteado: se usa para lo calculado y lo que todavia no esta confirmado. */
  dashed?: boolean;
}

export function Card({ dashed = false, className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'bg-surface-1 rounded-xl p-4',
        dashed ? 'border-border-strong border border-dashed' : 'border-border-subtle border',
        className,
      )}
      {...props}
    />
  );
}
