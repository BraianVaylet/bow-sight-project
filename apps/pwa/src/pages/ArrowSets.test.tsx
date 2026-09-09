import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ArrowSets } from './ArrowSets.js';

const get = vi.fn();
const post = vi.fn();

vi.mock('../app/api.js', () => ({
  api: { get: (...a: unknown[]) => get(...a), post: (...a: unknown[]) => post(...a) },
}));

function pintar() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <ArrowSets />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// Solo `post`: `get` se reconfigura en cada test, y resetear un mock que quedo
// con una promesa rechazada hace que vitest reporte un rechazo no manejado.
beforeEach(() => post.mockClear());

describe('los sets de flechas', () => {
  it('explica por que existen antes de pedir nada', async () => {
    // Sin la explicacion, "mis flechas" parece configuracion opcional, y el
    // arquero se saltea el unico paso que le permite anotar una marca.
    get.mockResolvedValue([]);
    pintar();

    expect(await screen.findByText(/una marca es de un set de flechas/i)).toBeInTheDocument();
  });

  it('sin sets, ofrece cargar el primero', async () => {
    get.mockResolvedValue([]);
    pintar();

    expect(await screen.findByText(/todavia no tenes sets/i)).toBeInTheDocument();
  });

  it('lista los que ya tiene', async () => {
    get.mockResolvedValue([
      { _id: 'a1', name: 'X10 450' },
      { _id: 'a2', name: 'Entrenamiento' },
    ]);
    pintar();

    expect(await screen.findByText('X10 450')).toBeInTheDocument();
    expect(screen.getByText('Entrenamiento')).toBeInTheDocument();
  });

  it('crear manda el nombre sin espacios de mas', async () => {
    get.mockResolvedValue([]);
    post.mockResolvedValue({ _id: 'a1', name: 'X10 450' });
    pintar();

    await screen.findByText(/todavia no tenes sets/i);
    await userEvent.type(screen.getByLabelText(/nombre del set/i), '  X10 450  ');
    await userEvent.click(screen.getByRole('button', { name: 'Agregar set' }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/equipment/arrow-sets',
        expect.objectContaining({ name: 'X10 450' }),
      );
    });
  });

  it('con el campo vacio no manda nada', async () => {
    get.mockResolvedValue([]);
    pintar();

    await screen.findByText(/todavia no tenes sets/i);
    await userEvent.click(screen.getByRole('button', { name: 'Agregar set' }));

    expect(post).not.toHaveBeenCalled();
  });

  it('un error al cargar se muestra', async () => {
    get.mockImplementation(() => Promise.reject(new Error('boom')));
    pintar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos cargar tus sets/i);
  });
});
