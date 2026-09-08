import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

/**
 * Cabeceras de seguridad. La API solo devuelve JSON, asi que la CSP puede ser
 * la mas restrictiva que existe: nada de nada.
 */
export const securityHeaders = createMiddleware<AppEnv>(async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('X-Frame-Options', 'DENY');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  c.header('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  // La respuesta de la API es de un usuario concreto: nunca cacheable.
  c.header('Cache-Control', 'no-store, private');
  c.header('Vary', 'Cookie');
  c.res.headers.delete('X-Powered-By');
});
