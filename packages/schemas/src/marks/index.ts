import { MARK_ORIGINS } from '@bow-sight/types';
import { z } from 'zod';
import { uuid } from '../common/ids.js';
import { LIMITS } from '../common/limits.js';

/**
 * Una marca: con **este** set de flechas, a **esta** distancia, la mira va en
 * **este** punto de la escala.
 *
 * 🔴 Canonico: distancia en **metros**, escala en **milimetros**. Nunca se
 * guarda un valor convertido — un dato convertido es un dato con una unidad
 * implicita, y las unidades implicitas son la forma mas cara de perder
 * informacion.
 */
const base = z.object({
  arrowSetId: uuid,
  distanceM: z
    .number()
    .gt(LIMITS.distanceM.min, 'validation.mark.distanceTooLow')
    .max(LIMITS.distanceM.max, 'validation.mark.distanceTooHigh'),
  scaleValueMm: z
    .number()
    .min(LIMITS.scaleMm.min, 'validation.scale.tooLow')
    .max(LIMITS.scaleMm.max, 'validation.scale.tooHigh'),
  /**
   * De donde sale. El cliente solo puede crear `measured`: `computed` lo hace el
   * modelo y `seeded` la semilla balistica, y ninguna de las dos se guarda como
   * si el arquero la hubiera tirado.
   */
  origin: z.literal(MARK_ORIGINS[0]).default('measured'),
  conditions: z
    .object({
      tempC: z.number().min(-30).max(60).optional(),
      altitudeM: z.number().min(-500).max(6000).optional(),
    })
    .optional(),
  notes: z.string().trim().max(500).optional(),
});

export const markCreateSchema = base.extend({ id: uuid });

/**
 * En una edicion viaja tambien el `updatedAt` que el cliente vio.
 *
 * Es la concurrencia optimista de ADR-006: si el servidor tiene uno mas nuevo,
 * responde 409 y la UI pregunta. **Nunca last-write-wins silencioso**: descartar
 * sin avisar una marca medida hace diez minutos en la linea de tiro es
 * inaceptable.
 */
export const markUpdateSchema = base.partial().extend({
  baseUpdatedAt: z.string().datetime().optional(),
});

/** Consulta de la calculadora: cualquier distancia, con angulo opcional. */
export const markQuerySchema = z.object({
  arrowSetId: uuid,
  distanceM: z.coerce.number().gt(LIMITS.distanceM.min).max(LIMITS.distanceM.max),
  /** Cuesta arriba o cuesta abajo. La distancia que importa es la horizontal. */
  angleDeg: z.coerce.number().min(LIMITS.angleDeg.min).max(LIMITS.angleDeg.max).optional(),
});

export type MarkCreate = z.infer<typeof markCreateSchema>;
export type MarkUpdate = z.infer<typeof markUpdateSchema>;
export type MarkQuery = z.infer<typeof markQuerySchema>;
