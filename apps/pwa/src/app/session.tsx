import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@bow-sight/client';
import { api, type Me } from './api.js';

/**
 * La sesion actual.
 *
 * Un 401 no es un error a mostrar: es "no hay sesion". Se traduce a `null` para
 * que las pantallas no tengan que distinguir entre "cargando", "roto" y "no
 * entraste".
 */
export function useMe() {
  return useQuery<Me | null>({
    queryKey: ['me'],
    staleTime: 60_000,
    queryFn: async () => {
      try {
        return await api.get<Me>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null;
        throw error;
      }
    },
  });
}
