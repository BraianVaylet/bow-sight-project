import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/errors.js';

/**
 * Query client compartido por las dos apps.
 *
 * 🔴 **No se reintenta un 4xx.** Un 404 o un 409 no mejoran por insistir: solo
 * gastan bateria en el campo de tiro y demoran el mensaje de error.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // 30 dias: la cache se persiste para que la app abra con datos en un
        // arranque en frio sin señal (ADR-006).
        gcTime: 1000 * 60 * 60 * 24 * 30,
        refetchOnWindowFocus: false,
        retry: (attempt, error) => {
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
          return attempt < 2;
        },
      },
      mutations: {
        // `offlineFirst`: la mutacion se intenta igual y, si no hay red, queda
        // pausada para reanudarse al reconectar (F3).
        networkMode: 'offlineFirst',
      },
    },
  });
}
