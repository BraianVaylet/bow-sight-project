import { randomUUID } from 'node:crypto';
import { createMiddleware } from 'hono/factory';
import type { AppEnv } from '../types.js';

/** Cabecera con la que el cliente puede correlacionar su pedido. */
export const REQUEST_ID_HEADER = 'x-request-id';

/**
 * Asigna un `requestId` a cada pedido y lo devuelve en la respuesta.
 *
 * Es lo que hace posible el soporte: el usuario ve el codigo y el `requestId` en
 * pantalla, los comparte, y del otro lado se encuentra exactamente que paso.
 */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  // Se acepta el del cliente si lo trae, para poder seguir una traza que
  // arranco en el navegador. Se acota el largo: es una cabecera de afuera.
  const incoming = c.req.header(REQUEST_ID_HEADER);
  const id = incoming && incoming.length <= 64 ? incoming : randomUUID();

  c.set('requestId', id);
  c.header(REQUEST_ID_HEADER, id);
  await next();
});
