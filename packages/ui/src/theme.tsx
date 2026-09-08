import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextValue {
  /** Lo que eligio el usuario. `system` sigue al sistema operativo. */
  theme: Theme;
  /** Lo que se esta viendo ahora mismo, ya resuelto. */
  resolved: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function prefersDark(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );
}

function apply(theme: Theme): 'light' | 'dark' {
  const resolved = theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
  const root = document.documentElement;
  // `system` no escribe el atributo: deja que mande la media query del CSS.
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  return resolved;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Clave de `localStorage`. La preferencia es del dispositivo, no de la cuenta. */
  storageKey?: string;
  defaultTheme?: Theme;
}

export function ThemeProvider({
  children,
  storageKey = 'bs-theme',
  defaultTheme = 'system',
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      // Modo privado o storage bloqueado: se sigue al sistema y listo.
    }
    return defaultTheme;
  });
  const [resolved, setResolved] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    setResolved(apply(theme));
  }, [theme]);

  // Con `system`, seguir al sistema si cambia mientras la app esta abierta.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => setResolved(apply('system'));
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        // Que no se pueda recordar la preferencia no puede romper la app.
      }
    },
    [storageKey],
  );

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme necesita estar dentro de <ThemeProvider>.');
  return ctx;
}
