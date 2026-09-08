/**
 * Constantes del dominio de marcas de mira.
 *
 * Solo lo que usa la matematica. Los limites de validacion viven en
 * `@bow-sight/schemas` y los codigos de error en `docs/errors.md`.
 */

/** Cantidad minima de marcas (por set de flechas) para desbloquear el calculo de intermedias. */
export const SIGHT_CALC_MIN_MARKS = 5;

/** Distancia de sala (indoor) que se agrega como marca calculada por defecto. */
export const INDOOR_DISTANCE_M = 18;

/** Paso (m) del listado imprimible: una fila cada 2 m desde la de sala. */
export const PRINT_STEP_M = 2;

/** Marcas del ruler: largos en px por tipo de tick. */
export const TICK_LENGTH_PX = { sm: 8, md: 14, lg: 22 } as const;

/** Umbral minimo (px) entre marcas para seguir dibujandolas. */
export const TICK_MIN_GAP_PX = 4;
