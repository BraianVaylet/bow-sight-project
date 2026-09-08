import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './theme.js';

/** Deja `matchMedia` bajo control: jsdom no lo trae. */
function mockPrefersDark(dark: boolean) {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return { fire: () => listeners.forEach((fn) => fn()) };
}

function Probe() {
  const { theme, resolved, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme('dark')}>Oscuro</button>
      <button onClick={() => setTheme('system')}>Sistema</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ThemeProvider', () => {
  it('sin eleccion previa sigue al sistema y no escribe el atributo', () => {
    mockPrefersDark(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    expect(screen.getByTestId('theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
    // Sin atributo, manda la media query del CSS.
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('una eleccion explicita escribe el atributo y gana sobre el sistema', async () => {
    mockPrefersDark(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Oscuro' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(screen.getByTestId('resolved')).toHaveTextContent('dark');
  });

  it('recuerda la eleccion en el dispositivo', async () => {
    mockPrefersDark(false);
    const { unmount } = render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Oscuro' }));
    unmount();

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('theme')).toHaveTextContent('dark');
  });

  it('volver a sistema saca el atributo', async () => {
    mockPrefersDark(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Oscuro' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    await userEvent.click(screen.getByRole('button', { name: 'Sistema' }));
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
  });

  it('si el storage esta bloqueado, la app arranca igual', () => {
    mockPrefersDark(false);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage bloqueado');
    });

    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );

    // Modo privado: no se puede recordar nada, pero se ve el tema del sistema.
    expect(screen.getByTestId('resolved')).toHaveTextContent('light');
    vi.restoreAllMocks();
  });

  it('usar el hook afuera del provider falla con un mensaje que dice que hacer', () => {
    // El error es de React al renderizar; se silencia el ruido de consola.
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
    spy.mockRestore();
  });
});
