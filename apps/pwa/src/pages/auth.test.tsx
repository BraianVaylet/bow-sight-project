import { ApiError } from '@bow-sight/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import type * as RouterModule from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfirmReset, RequestReset } from './ResetPassword.js';
import { SignIn } from './SignIn.js';
import { SignUp } from './SignUp.js';

const post = vi.fn();
const navigate = vi.fn();

vi.mock('../app/api.js', () => ({
  api: { get: vi.fn(), post: (...args: unknown[]) => post(...args) },
}));

vi.mock('react-router-dom', async () => {
  const real = await vi.importActual<typeof RouterModule>('react-router-dom');
  return { ...real, useNavigate: () => navigate };
});

function pintar(ui: ReactElement, ruta = '/') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[ruta]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

function apiError(code: string, messageKey: string, status = 400): ApiError {
  return new ApiError({ status, code: code as never, messageKey });
}

beforeEach(() => {
  post.mockReset();
  navigate.mockReset();
});

describe('crear cuenta', () => {
  it('manda nombre, email, clave y el idioma, y entra', async () => {
    post.mockResolvedValue({});
    pintar(<SignUp />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Braian');
    await userEvent.type(screen.getByLabelText(/email/i), 'braian@example.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'una-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/auth/sign-up', {
        name: 'Braian',
        email: 'braian@example.com',
        password: 'una-frase-larga',
        locale: 'es',
      });
    });
    expect(navigate).toHaveBeenCalledWith('/', { replace: true });
  });

  it('un email ya usado se explica, con su codigo a la vista', async () => {
    // El codigo va en pantalla a proposito: es lo que el arquero le pasa a
    // soporte cuando escribe.
    post.mockRejectedValue(apiError('BS-AUTH-409-004', 'errors.auth.emailTaken', 409));
    pintar(<SignUp />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Braian');
    await userEvent.type(screen.getByLabelText(/email/i), 'braian@example.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'una-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Ese email ya tiene una cuenta.');
    expect(screen.getByText('BS-AUTH-409-004')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('🔴 el boton se apaga mientras manda: dos toques no crean dos cuentas', async () => {
    let resolver: (v: unknown) => void = () => {};
    post.mockReturnValue(new Promise((r) => (resolver = r)));
    pintar(<SignUp />);

    await userEvent.type(screen.getByLabelText(/nombre/i), 'Braian');
    await userEvent.type(screen.getByLabelText(/email/i), 'braian@example.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'una-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Crear cuenta' }));

    const boton = await screen.findByRole('button', { name: 'Creando…' });
    expect(boton).toBeDisabled();

    resolver({});
    await waitFor(() => expect(navigate).toHaveBeenCalled());
    expect(post).toHaveBeenCalledTimes(1);
  });
});

describe('entrar', () => {
  it('credenciales validas llevan a la home', async () => {
    post.mockResolvedValue({});
    pintar(<SignIn />);

    await userEvent.type(screen.getByLabelText(/email/i), 'braian@example.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'una-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/', { replace: true }));
  });

  it('🔴 email inexistente y clave incorrecta dicen lo mismo', async () => {
    // La API manda `invalidCredentials` para las dos (mapAuthError): si dijeran
    // cosas distintas, esta pantalla seria un buscador de cuentas.
    post.mockRejectedValue(apiError('BS-AUTH-401-001', 'errors.auth.invalidCredentials', 401));
    pintar(<SignIn />);

    await userEvent.type(screen.getByLabelText(/email/i), 'nadie@example.com');
    await userEvent.type(screen.getByLabelText(/contraseña/i), 'lo-que-sea-largo');
    await userEvent.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Email o contraseña incorrectos.');
  });
});

describe('recuperar la contraseña', () => {
  it('🔴 responde lo mismo exista o no la cuenta', async () => {
    post.mockResolvedValue({});
    pintar(<RequestReset />);

    await userEvent.type(screen.getByLabelText(/email/i), 'nadie@example.com');
    await userEvent.click(screen.getByRole('button', { name: /mandarme el enlace/i }));

    expect(await screen.findByText(/si hay una cuenta con ese email/i)).toBeInTheDocument();
    // No dice "no existe", ni muestra el email de vuelta como confirmacion.
    expect(screen.queryByText(/no existe/i)).not.toBeInTheDocument();
  });

  it('con el token del mail, cambia la clave y avisa que cerro las sesiones', async () => {
    post.mockResolvedValue({});
    pintar(<ConfirmReset />, '/restablecer?token=abc123');

    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'otra-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: /cambiar la contraseña/i }));

    await waitFor(() => {
      expect(post).toHaveBeenCalledWith('/auth/password-reset/confirm', {
        token: 'abc123',
        newPassword: 'otra-frase-larga',
      });
    });
    expect(await screen.findByText(/cerramos las sesiones abiertas/i)).toBeInTheDocument();
  });

  it('🔴 sin token en la URL no se puede enviar', async () => {
    // Entrar a /restablecer a mano no puede parecer una pantalla que funciona.
    pintar(<ConfirmReset />, '/restablecer');
    expect(screen.getByRole('button', { name: /cambiar la contraseña/i })).toBeDisabled();
  });

  it('un token vencido lo dice sin dejar la pantalla muda', async () => {
    post.mockRejectedValue(apiError('BS-AUTH-400-007', 'errors.auth.badResetToken'));
    pintar(<ConfirmReset />, '/restablecer?token=viejo');

    await userEvent.type(screen.getByLabelText(/contraseña nueva/i), 'otra-frase-larga');
    await userEvent.click(screen.getByRole('button', { name: /cambiar la contraseña/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no sirve o ya venció/i);
  });
});

describe('la contraseña corta se avisa antes de enviar', () => {
  it('🔴 dice cuantos caracteres faltan mientras escribe', async () => {
    // La regla es del servidor y ahi se sigue aplicando. Esto evita completar
    // tres campos, apretar, y recien entonces enterarse.
    pintar(<SignUp />);

    await userEvent.type(screen.getByLabelText(/contraseña/i), 'corta');

    expect(screen.getByText(/te faltan 7 caracteres/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeDisabled();
    expect(post).not.toHaveBeenCalled();
  });

  it('con doce o mas, deja enviar', async () => {
    pintar(<SignUp />);

    await userEvent.type(screen.getByLabelText(/contraseña/i), 'una-frase-larga');

    expect(screen.queryByText(/te faltan/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Crear cuenta' })).toBeEnabled();
  });
});
