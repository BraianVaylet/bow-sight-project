import { ApiError } from '@bow-sight/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type * as RouterModule from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NewSight } from './NewSight.js';

const post = vi.fn();
const navigate = vi.fn();

vi.mock('../app/api.js', () => ({ api: { get: vi.fn(), post: (...a: unknown[]) => post(...a) } }));
vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof RouterModule>('react-router-dom');
  return { ...real, useNavigate: () => navigate };
});

function pintar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <NewSight />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

// `mockClear` y no `mockReset`: solo limpia las llamadas. Resetear un mock que
// quedo con una promesa rechazada hace que vitest reporte un rechazo no manejado.
beforeEach(() => {
  post.mockClear();
  navigate.mockClear();
});

describe('crear una mira', () => {
  it('🔴 el arquero escribe centimetros y se guardan milimetros', async () => {
    // Regla 6: se almacena canonico y la conversion ocurre en el borde. Si esta
    // pantalla mandara centimetros, la escala entera quedaria 10 veces chica y
    // no se notaria hasta ver la regla.
    post.mockResolvedValue({ _id: 's1' });
    pintar();

    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Shibuya');
    await userEvent.clear(screen.getByLabelText(/escala desde/i));
    await userEvent.type(screen.getByLabelText(/escala desde/i), '2.5');
    await userEvent.clear(screen.getByLabelText(/hasta/i));
    await userEvent.type(screen.getByLabelText(/hasta/i), '60');
    await userEvent.click(screen.getByRole('button', { name: 'Crear mira' }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith(
        '/sights',
        expect.objectContaining({ name: 'Shibuya', scaleMinMm: 25, scaleMaxMm: 600 }),
      );
    });
  });

  it('deja la mira recien creada abierta, no vuelve al listado', async () => {
    post.mockResolvedValue({ _id: 's1' });
    pintar();

    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Shibuya');
    await userEvent.click(screen.getByRole('button', { name: 'Crear mira' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/miras/s1', { replace: true }));
  });

  it('🔴 con el rango al reves no deja guardar, y lo dice antes', async () => {
    // La API tambien lo rechaza (BS-SIGHT-400-002), pero enterarse despues de
    // apretar es peor que ver el error mientras se escribe.
    pintar();

    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Shibuya');
    await userEvent.clear(screen.getByLabelText(/hasta/i));
    await userEvent.type(screen.getByLabelText(/hasta/i), '0');

    expect(screen.getByText(/el maximo tiene que ser mayor/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear mira' })).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });

  it('sin nombre tampoco', async () => {
    pintar();
    expect(screen.getByRole('button', { name: 'Crear mira' })).toBeDisabled();
  });

  it('un error de la API se muestra con su codigo', async () => {
    post.mockImplementation(() =>
      Promise.reject(
        new ApiError({
          status: 400,
          code: 'BS-SIGHT-400-002',
          messageKey: 'errors.sight.badScaleRange',
        }),
      ),
    );
    pintar();

    await userEvent.type(screen.getByLabelText(/^Nombre/), 'Shibuya');
    await userEvent.click(screen.getByRole('button', { name: 'Crear mira' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/escala mínima/i);
  });
});
