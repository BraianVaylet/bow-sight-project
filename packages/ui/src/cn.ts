import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Une clases y resuelve los conflictos de Tailwind quedandose con la ultima.
 * Sin esto, `cn('p-2', props.className)` con `p-4` afuera deja las dos y gana
 * la que el CSS decida, que no es la que el que escribio el componente espera.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
