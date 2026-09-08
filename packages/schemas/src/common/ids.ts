import { z } from 'zod';

/**
 * Los ids los genera el **cliente**, con UUIDv7.
 *
 * Es lo que hace posible la cola offline sin paso de reconciliacion: el servidor
 * devuelve el mismo id que el cliente ya escribio en su cache (ADR-006). Y v7
 * ordena por tiempo de creacion sin un indice extra.
 */
export const uuid = z.string().uuid();

/** Clave de idempotencia de una mutacion sincronizable. */
export const idempotencyKey = z.string().uuid();
