import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary.js';

/**
 * React escribe el error en la consola cuando lo captura un boundary. Es ruido
 * esperado: se silencia para que la salida de los tests siga siendo legible.
 */
const consola = vi.spyOn(console, 'error').mockImplementation(() => {});
afterEach(() => {
  consola.mockClear();
  debeRomper = true;
});

function Explota(): never {
  throw new Error('boom');
}

/**
 * Rompe mientras el test lo diga.
 *
 * 🔴 La bandera la maneja el test, no el componente. Un componente que se
 * "arregla solo" en el primer render no sirve: ante un throw, React **reintenta
 * el render una vez** antes de caer al boundary, y ese reintento lo encontraria
 * ya arreglado — el boundary nunca se activaria y el test verificaria nada.
 */
let debeRomper = true;
function Rompible() {
  if (debeRomper) throw new Error('boom');
  return <p>Anduvo</p>;
}

describe('la ultima red', () => {
  it('🔴 un error de render no deja la pantalla en blanco', async () => {
    // Sin boundary, React desmonta el arbol entero y no queda nada — ni
    // siquiera un boton para recargar. En el campo de tiro, una pantalla blanca
    // es indistinguible de un telefono colgado.
    const { container } = render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(container.textContent).not.toBe('');
    expect(await screen.findByRole('alert')).toHaveTextContent(/se rompio algo de nuestro lado/i);
  });

  it('dice que las marcas estan a salvo, que es lo que el arquero necesita saber', () => {
    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(/marcas estan a salvo/i);
  });

  it('ofrece reintentar sin recargar, y recargar como ultimo recurso', () => {
    render(
      <ErrorBoundary>
        <Explota />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('button', { name: 'Volver a intentar' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar la app' })).toBeInTheDocument();
  });

  it('reintentar vuelve a montar: si el error era pasajero, se sigue trabajando', async () => {
    render(
      <ErrorBoundary>
        <Rompible />
      </ErrorBoundary>,
    );
    await screen.findByRole('alert');

    // El error era pasajero: para cuando el arquero toca "volver a intentar", lo
    // que fallaba ya anda.
    debeRomper = false;
    await userEvent.click(screen.getByRole('button', { name: 'Volver a intentar' }));

    expect(await screen.findByText('Anduvo')).toBeInTheDocument();
  });

  it('sin error, no se mete en el medio', () => {
    render(
      <ErrorBoundary>
        <p>Mis miras</p>
      </ErrorBoundary>,
    );

    expect(screen.getByText('Mis miras')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
