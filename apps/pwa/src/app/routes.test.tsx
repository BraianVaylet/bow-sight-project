import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ApiError } from '@bow-sight/client';
import userEvent from '@testing-library/user-event';
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

describe('cuando la API no contesta', () => {
  // 🔴 "No hay sesion" y "no pudimos preguntar" son cosas distintas, y la app
  // tiene que tratarlas distinto. Con la API caida el arquero veia una pantalla
  // **en blanco**, que en la linea de tiro es indistinguible de un telefono
  // colgado.
  const caido = () =>
    get.mockImplementation(() =>
      Promise.reject(
        new ApiError({ status: 500, code: 'BS-SYS-500-005', messageKey: 'errors.system.internal' }),
      ),
    );

  it('🔴 una ruta privada lo dice y ofrece reintentar, no manda a entrar', async () => {
    // Mandarlo a entrar le diria que se deslogueo cuando lo unico que pasa es
    // que el servidor no contesta.
    caido();
    pintar('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos verificar tu sesion/i);
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Entrar' })).not.toBeInTheDocument();
  });

  it('sin red lo dice con esas palabras', async () => {
    get.mockImplementation(() => Promise.reject(ApiError.network()));
    pintar('/');

    expect(await screen.findByRole('alert')).toHaveTextContent(/sin conexion/i);
  });

  it('reintentar vuelve a preguntar, y si anda entra', async () => {
    caido();
    pintar('/');
    await screen.findByRole('button', { name: 'Reintentar' });

    get.mockImplementation((path: string) =>
      path === '/auth/me' ? Promise.resolve(SESION) : Promise.resolve([]),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByRole('heading', { name: 'Mis miras' })).toBeInTheDocument();
  });

  it('🔴 entrar se puede ver igual: es publica y el problema es nuestro', async () => {
    // Bloquear el login porque no pudimos preguntar si ya habia sesion seria
    // dejarlo afuera por un problema que no es suyo.
    caido();
    pintar('/entrar');

    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('🔴 mientras averigua muestra que esta cargando, nunca una pantalla vacia', async () => {
    let responder: (v: unknown) => void = () => {};
    get.mockReturnValue(new Promise((r) => (responder = r)));
    const { container } = pintar('/entrar');

    expect(await screen.findByText('Cargando')).toBeInTheDocument();
    expect(container.textContent).not.toBe('');

    responder(null);
    expect(await screen.findByRole('heading', { name: 'Entrar' })).toBeInTheDocument();
  });
});
