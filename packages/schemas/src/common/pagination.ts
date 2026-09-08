import { z } from 'zod';

/**
 * Paginacion por **cursor**, nunca por `skip`.
 *
 * `skip` obliga a la base a contar y descartar todo lo anterior en cada pagina,
 * asi que la pagina 50 cuesta cincuenta veces mas que la primera. Y si alguien
 * crea algo mientras se pagina, se saltean o se repiten filas.
 */
export const cursorQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});

export type CursorQuery = z.infer<typeof cursorQuery>;

export interface Page<T> {
  items: T[];
  /** `null` cuando no hay mas. */
  nextCursor: string | null;
}
