import { ApiError } from '@bow-sight/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { Sights } from './Sights.js';

const get = vi.fn();
vi.mock('../app/api.js', () => ({ api: { get: (...a: unknown[]) => get(...a), post: vi.fn() } }));

function pintar() {
  const queryClient = new QueryClient({
    // El `QueryCache` con `onError` vacio es deliberado: uno de estos tests
    // provoca un error de red a proposito, y React Query deja una rama de esa
    // promesa sin consumir. Sin este handler, vitest la ve como un rechazo no
    // manejado y falla el test que justamente verifica que el error se muestra.
    queryCache: new QueryCache({ onError: () => {} }),
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Sights />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function mira(over: Partial<Record<string, unknown>> = {}) {
  return {
    _id: 's1',
    name: 'Shibuya',
    scaleMinMm: 0,
    scaleMaxMm: 600,
    scaleUnit: 'cm',
    status: 'active',
    ...over,
  };
}

// Sin `beforeEach(get.mockReset())` a proposito: cada test declara su propio
// stub, asi que no hace falta, y resetear un mock cuyo ultimo resultado fue una
// promesa rechazada hace que vitest reporte ese rechazo como no manejado — y
// falla justo el test que verifica que el error se muestra en pantalla.

describe('la lista de miras', () => {
  it('mientras carga lo dice, y no muestra una lista vacia', async () => {
    // Una lista vacia mientras carga se lee como "no tenés miras", que es
    // justo lo contrario de lo que esta pasando.
    //
    // La promesa se resuelve al final a proposito: una que nunca resuelve
    // sobrevive al test y hace explotar por timeout al que viene despues.
    let responder: (v: unknown) => void = () => {};
    get.mockReturnValue(new Promise((r) => (responder = r)));
    pintar();

    expect(await screen.findByText('Cargando tus miras')).toBeInTheDocument();
    expect(screen.queryByText(/todavía no tenés miras/i)).not.toBeInTheDocument();

    responder([]);
    expect(await screen.findByText(/todavía no tenés miras/i)).toBeInTheDocument();
  });

  it('sin miras ofrece crear la primera', async () => {
    get.mockResolvedValue([]);
    pintar();

    expect(await screen.findByText(/todavía no tenés miras/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Nueva mira' })).toHaveAttribute(
      'href',
      '/miras/nueva',
    );
  });

  it('un error de la API se explica con su codigo', async () => {
    // `mockImplementation` y no `mockRejectedValue`: este ultimo crea la
    // promesa rechazada al declararla, antes de que nadie la espere, y Node la
    // reporta como rechazo no manejado.
    get.mockImplementation(() =>
      Promise.reject(
        new ApiError({ status: 0, code: 'NETWORK', messageKey: 'errors.network.offline' }),
      ),
    );
    pintar();

    expect(await screen.findByRole('alert')).toHaveTextContent(/sin conexion/i);
  });

  describe('🔴 la escala se muestra en la unidad de SU mira', () => {
    // Regla 6: adentro todo es canonico en milimetros; la conversion ocurre
    // aca, en el borde, y nunca se guarda ya convertida.
    it('centimetros', async () => {
      get.mockResolvedValue([mira({ scaleUnit: 'cm', scaleMinMm: 0, scaleMaxMm: 600 })]);
      pintar();
      expect(await screen.findByText('0–60 cm')).toBeInTheDocument();
    });

    it('pulgadas, con un decimal', async () => {
      get.mockResolvedValue([mira({ scaleUnit: 'in', scaleMinMm: 0, scaleMaxMm: 254 })]);
      pintar();
      expect(await screen.findByText('0.0–10.0 in')).toBeInTheDocument();
    });

    it('clicks: se muestra el canonico, no una conversion inventada', async () => {
      // Sin el tamaño del click no hay conversion posible (F1-B); mostrar
      // milimetros es honesto, inventar clicks no.
      get.mockResolvedValue([mira({ scaleUnit: 'click', scaleMinMm: 0, scaleMaxMm: 600 })]);
      pintar();
      expect(await screen.findByText('0–600 mm')).toBeInTheDocument();
    });
  });

  it('cada mira enlaza a la suya', async () => {
    get.mockResolvedValue([mira(), mira({ _id: 's2', name: 'Axcel' })]);
    pintar();

    expect(await screen.findByRole('link', { name: /Shibuya/ })).toHaveAttribute(
      'href',
      '/miras/s1',
    );
    expect(screen.getByRole('link', { name: /Axcel/ })).toHaveAttribute('href', '/miras/s2');
  });
});
