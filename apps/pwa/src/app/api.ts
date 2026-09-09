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

export interface ArrowSet {
  _id: string;
  name: string;
}

export interface Mark {
  _id: string;
  arrowSetId: string;
  /** 🔴 Canonico: metros. */
  distanceM: number;
  /** 🔴 Canonico: milimetros. La conversion a cm ocurre solo al mostrar. */
  scaleValueMm: number;
  origin: 'measured';
  updatedAt: string;
}

/** Lo que devuelve la calculadora. El math lo corre el servidor. */
export interface Calculo {
  distanceM: number;
  horizontalDistanceM: number;
  scaleValueMm: number;
  /** `false` => extrapolada, fuera de lo que el arquero midio. Se muestra con `≈`. */
  interpolated: boolean;
  withinScale: boolean;
  /** Residuo maximo del ajuste: la semilla del Mark Doctor (F1-E). */
  fitQuality: number;
  computed: { distanceM: number; scaleValue: number; interpolated: boolean }[];
}
