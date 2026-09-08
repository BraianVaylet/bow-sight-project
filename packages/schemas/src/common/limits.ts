/**
 * Limites de validacion, en un solo lugar.
 *
 * 🔴 **Prohibido duplicar una regla de validacion.** Si esta en dos lados, un
 * dia van a decir cosas distintas — y la que va a estar mal es la del servidor,
 * porque el front se prueba mas.
 *
 * Las unidades son las **canonicas**: distancias en metros, escala en
 * milimetros. La conversion ocurre en el borde de presentacion.
 */
export const LIMITS = {
  name: { min: 1, max: 80 },
  notes: { max: 2000 },

  /** Escala de la mira, en milimetros. 1000 mm = 100 cm, mas que cualquier mira real. */
  scaleMm: { min: 0, max: 1000 },
  /** Tamaño de un click, en milimetros. Las miras con click van de 0.1 a 5 mm. */
  clickSizeMm: { min: 0.01, max: 10 },

  /** Distancia de tiro, en metros. El maximo cubre 300 m, mas que cualquier ronda. */
  distanceM: { min: 0, max: 300 },

  /** Specs de flechas. Rangos generosos: acotan lo absurdo, no lo raro. */
  spine: { min: 100, max: 2000 },
  pointGrains: { min: 20, max: 500 },
  arrowLengthIn: { min: 10, max: 40 },
  totalGrains: { min: 100, max: 1200 },
  speedFps: { min: 100, max: 500 },

  /** Specs de arco. */
  drawWeightLb: { min: 10, max: 100 },
  ataIn: { min: 20, max: 50 },
  braceHeightIn: { min: 4, max: 12 },
  drawLengthIn: { min: 15, max: 40 },

  /** Corte por angulo: cuesta arriba y cuesta abajo. */
  angleDeg: { min: -60, max: 60 },
} as const;

/** Marcas medidas necesarias, por set, para desbloquear el calculo. */
export const SIGHT_CALC_MIN_MARKS = 5;
