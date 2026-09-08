import { SCALE_UNITS, DISTANCE_UNITS } from '@bow-sight/types';
import { z } from 'zod';
import { uuid } from '../common/ids.js';
import { LIMITS } from '../common/limits.js';

const scaleMm = z
  .number()
  .min(LIMITS.scaleMm.min, 'validation.scale.tooLow')
  .max(LIMITS.scaleMm.max, 'validation.scale.tooHigh');

const base = z.object({
  name: z.string().trim().min(LIMITS.name.min).max(LIMITS.name.max),
  /** 🔴 Canonico en **milimetros**. La unidad de abajo es solo para mostrar. */
  scaleMinMm: scaleMm,
  scaleMaxMm: scaleMm,
  /** Como lee el arquero la escala de SU mira. */
  scaleUnit: z.enum(SCALE_UNITS).default('cm'),
  /** Obligatorio si la escala es en clicks: sin el, un click no significa nada. */
  clickSizeMm: z
    .number()
    .min(LIMITS.clickSizeMm.min)
    .max(LIMITS.clickSizeMm.max)
    .nullable()
    .optional(),
  /** Override por mira de la unidad de distancia del usuario. */
  distanceUnit: z.enum(DISTANCE_UNITS).nullable().optional(),
  bowSetupId: uuid.nullable().optional(),
  defaultArrowSetId: uuid.nullable().optional(),
});

/** Las dos reglas que no se pueden expresar campo por campo. */
function refineSight<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value: unknown, ctx: z.RefinementCtx) => {
    const v = value as Partial<z.infer<typeof base>>;

    if (v.scaleMinMm !== undefined && v.scaleMaxMm !== undefined && v.scaleMinMm >= v.scaleMaxMm) {
      ctx.addIssue({
        code: 'custom',
        path: ['scaleMaxMm'],
        message: 'validation.sight.badScaleRange',
      });
    }

    if (v.scaleUnit === 'click' && (v.clickSizeMm === undefined || v.clickSizeMm === null)) {
      ctx.addIssue({
        code: 'custom',
        path: ['clickSizeMm'],
        message: 'validation.sight.missingClickSize',
      });
    }
  });
}

export const sightCreateSchema = refineSight(base.extend({ id: uuid }));
export const sightUpdateSchema = refineSight(base.partial());

export type SightCreate = z.infer<typeof sightCreateSchema>;
export type SightUpdate = z.infer<typeof sightUpdateSchema>;
