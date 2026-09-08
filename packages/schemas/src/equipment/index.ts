import { z } from 'zod';
import { LIMITS } from '../common/limits.js';
import { uuid } from '../common/ids.js';

const name = z.string().trim().min(LIMITS.name.min).max(LIMITS.name.max);
const notes = z.string().trim().max(LIMITS.notes.max).optional();

/** Rango numerico opcional, con la clave de error ya puesta. */
function ranged(bounds: { min: number; max: number }, key: string) {
  return z
    .number()
    .min(bounds.min, `validation.${key}.tooLow`)
    .max(bounds.max, `validation.${key}.tooHigh`)
    .optional();
}

export const bowSetupCreateSchema = z.object({
  id: uuid,
  name,
  brand: z.string().trim().max(60).optional(),
  model: z.string().trim().max(60).optional(),
  drawWeightLb: ranged(LIMITS.drawWeightLb, 'drawWeight'),
  ataIn: ranged(LIMITS.ataIn, 'ata'),
  braceHeightIn: ranged(LIMITS.braceHeightIn, 'braceHeight'),
  drawLengthIn: ranged(LIMITS.drawLengthIn, 'drawLength'),
  notes,
});

export const bowSetupUpdateSchema = bowSetupCreateSchema.omit({ id: true }).partial();

/**
 * Set de flechas.
 *
 * 🔴 Los campos son **estructurados**, no un `notes` de texto libre. Sin eso no
 * hay semilla balistica ni comparacion entre sets, que son dos de las razones
 * para pagar Max. Todos son opcionales: nadie queda bloqueado por no tener un
 * cronografo.
 */
export const arrowSetCreateSchema = z.object({
  id: uuid,
  name,
  spine: ranged(LIMITS.spine, 'spine'),
  pointGrains: ranged(LIMITS.pointGrains, 'pointGrains'),
  lengthIn: ranged(LIMITS.arrowLengthIn, 'arrowLength'),
  vane: z.string().trim().max(40).optional(),
  nock: z.string().trim().max(40).optional(),
  totalGrains: ranged(LIMITS.totalGrains, 'totalGrains'),
  speedFps: ranged(LIMITS.speedFps, 'speed'),
  /** Color de vanes, para reconocerlo de un vistazo en la botonera. */
  vaneColor: z
    .enum(['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'black', 'white'])
    .optional(),
  notes,
});

export const arrowSetUpdateSchema = arrowSetCreateSchema.omit({ id: true }).partial();

export type BowSetupCreate = z.infer<typeof bowSetupCreateSchema>;
export type BowSetupUpdate = z.infer<typeof bowSetupUpdateSchema>;
export type ArrowSetCreate = z.infer<typeof arrowSetCreateSchema>;
export type ArrowSetUpdate = z.infer<typeof arrowSetUpdateSchema>;
