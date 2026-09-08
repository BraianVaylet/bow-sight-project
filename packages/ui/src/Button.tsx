import { buttonClasses, type ButtonSize, type ButtonTone } from './buttonStyles.js';

export type { ButtonSize, ButtonTone };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  /** Ocupa todo el ancho. En mobile es lo normal para la accion principal. */
  block?: boolean;
}

export function Button({
  tone = 'neutral',
  size = 'md',
  block = false,
  className,
  // Por defecto `button`: un boton sin tipo dentro de un form envia el form, y
  // ese bug aparece recien cuando alguien pone el primer boton en un formulario.
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ tone, size, block, ...(className ? { className } : {}) })}
      {...props}
    />
  );
}
