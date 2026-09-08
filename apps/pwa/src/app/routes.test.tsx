import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from './routes.js';

/** El cliente de API se stubea: estos tests son de navegacion, no de red. */
const get = vi.fn();
vi.mock('./api.js', () => ({ api: { get: (...args: unknown[]) => get(...args), post: vi.fn() } }));

function pintar(ruta: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const SESION = {
  id: 'u1',
  email: 'braian@example.com',
  name: 'Braian',
  emailVerified: true,
  locale: 'es',
  distanceUnit: 'm',
  planCode: 'free',
};

beforeEach(() => {
  get.mockReset();
});

describe('guardas de ruta', () => {
  it('🔴 sin sesion, lo del arquero manda a entrar', async () => {
    get.mockResolvedValue(null);
    pintar('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    });
  });

  it('con sesion, la home muestra sus miras', async () => {
    get.mockImplementation((path: string) =>
      path === '/auth/me' ? Promise.resolve(SESION) : Promise.resolve([]),
    );
    pintar('/');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mis miras' })).toBeInTheDocument();
    });
  });

  it('con sesion abierta, entrar redirige a la home: no tiene sentido', async () => {
    get.mockImplementation((path: string) =>
      path === '/auth/me' ? Promise.resolve(SESION) : Promise.resolve([]),
    );
    pintar('/entrar');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Mis miras' })).toBeInTheDocument();
    });
  });

  it('🔴 la vuelta del mail de verificacion es publica: se llega sin sesion', async () => {
    // Si exigiera sesion, quien abre el mail en otro dispositivo veria un login
    // en vez de la confirmacion.
    get.mockResolvedValue(null);
    pintar('/email-verificado?estado=ok');

    expect(screen.getByRole('heading', { name: 'Email confirmado' })).toBeInTheDocument();
  });

  it('un enlace de verificacion vencido lo dice sin culpar al arquero', async () => {
    get.mockResolvedValue(null);
    pintar('/email-verificado?estado=invalido');

    expect(screen.getByRole('heading', { name: 'Ese enlace no sirve' })).toBeInTheDocument();
    expect(screen.getByText(/pedí uno nuevo/i)).toBeInTheDocument();
  });

  it('restablecer la clave tambien es publica: se llega desde el mail', async () => {
    get.mockResolvedValue(null);
    pintar('/restablecer?token=abc');

    expect(screen.getByRole('heading', { name: 'Nueva contraseña' })).toBeInTheDocument();
  });

  it('una ruta que no existe vuelve a la home', async () => {
    get.mockResolvedValue(null);
    pintar('/no-existe');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
    });
  });
});
