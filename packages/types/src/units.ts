/**
 * Unidades del dominio.
 *
 * Canonico: distancias en METROS, escala de mira en MILIMETROS. La conversion
 * ocurre solo en el borde de presentacion — nunca se guarda un valor convertido.
 */

/** Unidad en la que el arquero lee la escala fisica de SU mira. */
export const SCALE_UNITS = ['cm', 'in', 'click'] as const;
export type ScaleUnit = (typeof SCALE_UNITS)[number];

/** Unidad en la que el arquero piensa las distancias. Depende del pais, no de la mira. */
export const DISTANCE_UNITS = ['m', 'yd'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];

/** Idiomas soportados por el producto. */
export const LOCALES = ['es', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
