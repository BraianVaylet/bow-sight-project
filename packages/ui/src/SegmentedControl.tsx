import { useId } from 'react';
import { cn } from './cn.js';

export interface SegmentedOption {
  value: string;
  label: string;
}

export interface SegmentedControlProps {
  /** Que representa el grupo. Es el `legend`, y no es opcional. */
  label: string;
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Botonera de una sola eleccion — en la app, el set de flechas visible.
 *
 * Se implementa con **radios nativos** y no con botones: asi las flechas del
 * teclado se mueven entre opciones y el lector de pantalla anuncia "1 de 3"
 * sin que nadie tenga que escribir el manejo de foco.
 */
export function SegmentedControl({
  label,
  options,
  value,
  onChange,
  className,
}: SegmentedControlProps) {
  const name = useId();

  return (
    <fieldset
      // Los fieldset traen un `min-inline-size: min-content` del navegador que
      // les impide encogerse: sin esto, una botonera larga desborda en mobile.
      className={cn('min-w-0', className)}
    >
      <legend className="sr-only">{label}</legend>
      <div className="bg-surface-2 flex gap-1 rounded-lg p-1">
        {options.map((option) => {
          const checked = option.value === value;
          return (
            <label
              key={option.value}
              className={cn(
                'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-medium',
                'has-[:focus-visible]:outline-accent has-[:focus-visible]:outline has-[:focus-visible]:outline-2',
                checked ? 'bg-surface-1 text-ink shadow-sm' : 'text-ink-secondary',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
