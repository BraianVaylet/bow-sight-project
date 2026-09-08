import { useId } from 'react';
import { cn } from './cn.js';

/** Lo que el control tiene que recibir para quedar bien anunciado. */
export interface FieldAria {
  id: string;
  'aria-describedby': string | undefined;
  'aria-invalid': boolean | undefined;
  required: boolean | undefined;
}

export interface FieldProps {
  label: string;
  /** Texto de ayuda. Se anuncia junto con el label. */
  hint?: string;
  /** Mensaje de error **ya traducido**: aca no llega una clave. */
  error?: string;
  required?: boolean;
  className?: string;
  /**
   * Render prop a proposito. Cablear `aria-describedby` y `aria-invalid` a mano
   * en cada formulario es justo lo que siempre se olvida, y el olvido no se ve:
   * la pantalla queda igual y el lector de pantalla no dice nada.
   */
  children: (aria: FieldAria) => React.ReactNode;
}

export function Field({ label, hint, error, required, className, children }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-ink text-sm font-medium">
        {label}
        {required ? (
          <span className="text-danger ml-0.5" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': error ? true : undefined,
        required: required || undefined,
      })}

      {hint ? (
        <p id={hintId} className="text-ink-muted text-xs">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-danger text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
