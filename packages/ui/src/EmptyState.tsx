import { cn } from './cn.js';

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  /** Que puede hacer el usuario ahora. Un vacio sin salida es un callejon. */
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, action, className, ...props }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-border-strong flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center',
        className,
      )}
      {...props}
    >
      <p className="text-ink font-medium">{title}</p>
      {description ? <p className="text-ink-secondary text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
