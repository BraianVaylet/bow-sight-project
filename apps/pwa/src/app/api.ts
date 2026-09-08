import { createApiClient } from '@bow-sight/client';

/**
 * Cliente unico de la app.
 *
 * En dev, Vite proxea `/api` al backend; en produccion la PWA y la API viven en
 * dominios distintos, asi que la base sale de la variable de entorno.
 */
export const api = createApiClient({
  baseUrl: `${import.meta.env['VITE_API_URL'] ?? ''}/api/v1`,
});

export interface Me {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  locale: 'es' | 'en';
  distanceUnit: 'm' | 'yd';
  planCode: string;
}

export interface Sight {
  _id: string;
  name: string;
  scaleMinMm: number;
  scaleMaxMm: number;
  scaleUnit: 'cm' | 'in' | 'click';
  status: 'active' | 'locked' | 'archived';
}
