import type { Context } from 'hono';
import type { z } from 'zod';
import { AppError } from './errors.js';

/**
 * Parsea con Zod y convierte un fallo en nuestro 400 tipado.
 *
 * 🔴 El `messageKey` sale del **mensaje del schema**, que es una clave, no
 * prosa. El campo que fallo viaja en `params` para que la UI lo marque.
 */
function fail(issue: z.core.$ZodIssue | undefined): never {
  throw new AppError({
    status: 400,
    code: 'BS-SYS-400-001',
    messageKey: issue?.message ?? 'errors.system.validation',
    params: { field: issue?.path.join('.') || 'body' },
  });
}

export async function parseBody<T>(c: Context, schema: z.ZodType<T>): Promise<T> {
  const raw = await c.req.json().catch(() => ({}));
  const result = schema.safeParse(raw);
  if (!result.success) fail(result.error.issues[0]);
  return result.data;
}

export function parseQuery<T>(c: Context, schema: z.ZodType<T>): T {
  const result = schema.safeParse(c.req.query());
  if (!result.success) fail(result.error.issues[0]);
  return result.data;
}

/** Los ids son UUID del cliente: se valida la forma antes de tocar la base. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseId(c: Context, param: string): string {
  const value = c.req.param(param);
  if (!value || !UUID.test(value)) {
    throw new AppError({
      status: 400,
      code: 'BS-SYS-400-001',
      messageKey: 'errors.system.validation',
      params: { field: param },
    });
  }
  return value;
}
