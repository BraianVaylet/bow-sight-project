/**
 * Casos borde del modelo de marcas.
 *
 * Los tests portados de bv-bow-sight (`sightMarks.test.ts`) cubren el
 * comportamiento nominal y no se tocan. Este archivo cubre las ramas de error y
 * los caminos raros: son justo donde se esconderia un bug numerico.
 */
import { describe, expect, it } from 'vitest';
import {
  computeSightMarks,
  createSightModel,
  fitQuadratic,
  printableSightMarks,
} from './sightMarks.js';

describe('fitQuadratic — condiciones de error', () => {
  it('rechaza menos de 3 marcas: una parabola necesita tres puntos', () => {
    expect(() => fitQuadratic([{ distance: 20, mark: 1 }])).toThrow(/al menos 3 marcas/);
    expect(() =>
      fitQuadratic([
        { distance: 20, mark: 1 },
        { distance: 30, mark: 2 },
      ]),
    ).toThrow(/al menos 3 marcas/);
  });

  it('rechaza puntos degenerados: con dos distancias distintas el sistema no tiene solucion unica', () => {
    expect(() =>
      fitQuadratic([
        { distance: 20, mark: 1 },
        { distance: 20, mark: 1.1 },
        { distance: 30, mark: 2 },
      ]),
    ).toThrow(/degenerados/);
  });
});

describe('createSightModel — datos sucios', () => {
  it('colapsa distancias repetidas promediando las marcas', () => {
    const model = createSightModel([
      { distance: 20, mark: 1.0 },
      { distance: 20, mark: 1.4 }, // el arquero cargo 20 m dos veces
      { distance: 30, mark: 2.0 },
      { distance: 40, mark: 3.2 },
    ]);

    // Sin el colapso, PCHIP dividiria por h = 0 y devolveria NaN.
    expect(model.markAt(20).mark).toBeCloseTo(1.2, 6);
    expect(Number.isNaN(model.markAt(25).mark)).toBe(false);
  });

  it('no explota cuando las marcas no son monotonas: la tangente se anula en el extremo local', () => {
    // Una marca claramente mal medida (la de 30 m rompe la subida).
    const model = createSightModel([
      { distance: 20, mark: 1.0 },
      { distance: 30, mark: 0.6 },
      { distance: 40, mark: 2.0 },
      { distance: 50, mark: 3.0 },
    ]);

    for (const d of [20, 25, 30, 35, 40, 45, 50]) {
      expect(Number.isFinite(model.markAt(d).mark)).toBe(true);
    }
    // PCHIP pasa exacto por lo que el arquero tiro, aunque sea raro.
    expect(model.markAt(30).mark).toBeCloseTo(0.6, 6);
  });

  it('recorta la tangente del extremo cuando la pendiente inicial se dispara', () => {
    const model = createSightModel([
      { distance: 18, mark: 0.2 },
      { distance: 20, mark: 2.0 }, // salto grande
      { distance: 30, mark: 2.1 },
      { distance: 40, mark: 2.2 },
    ]);

    // Sin recorte, el spline sobrepasaria por arriba entre 18 y 20.
    const between = model.markAt(19).mark;
    expect(between).toBeGreaterThanOrEqual(0.2);
    expect(between).toBeLessThanOrEqual(2.0);
  });
});

describe('computeSightMarks — filtros', () => {
  const model = createSightModel([
    { distance: 20, mark: 0.4 },
    { distance: 30, mark: 1.2 },
    { distance: 40, mark: 2.1 },
    { distance: 50, mark: 3.2 },
    { distance: 60, mark: 4.5 },
  ]);

  it('descarta las marcas que caen fuera de la escala de la mira', () => {
    const estrecha = computeSightMarks(model, [20, 30, 40, 50, 60], {
      scaleMin: 0,
      scaleMax: 1.5,
    });
    expect(estrecha.every((m) => m.scaleValue <= 1.5)).toBe(true);

    const ancha = computeSightMarks(model, [20, 30, 40, 50, 60], { scaleMin: 0, scaleMax: 6 });
    expect(ancha.length).toBeGreaterThan(estrecha.length);
  });

  it('no repite una distancia que el arquero ya cargo', () => {
    const out = computeSightMarks(model, [18, 20, 30, 40, 50, 60], { scaleMin: 0, scaleMax: 6 });
    expect(out.some((m) => m.distanceM === 18)).toBe(false);
  });
});

describe('printableSightMarks — grilla', () => {
  const model = createSightModel([
    { distance: 20, mark: 0.4 },
    { distance: 30, mark: 1.2 },
    { distance: 40, mark: 2.1 },
  ]);

  it('rechaza un paso no positivo', () => {
    expect(() =>
      printableSightMarks(model, [20, 30, 40], { step: 0, scaleMin: 0, scaleMax: 6 }),
    ).toThrow(/paso debe ser mayor que 0/);
    expect(() =>
      printableSightMarks(model, [20, 30, 40], { step: -2, scaleMin: 0, scaleMax: 6 }),
    ).toThrow(/paso debe ser mayor que 0/);
  });

  it('devuelve una sola fila si la maxima registrada no llega al arranque de la grilla', () => {
    const corto = createSightModel([
      { distance: 8, mark: 0.1 },
      { distance: 10, mark: 0.2 },
      { distance: 12, mark: 0.3 },
    ]);
    const out = printableSightMarks(corto, [8, 10, 12], { from: 18, scaleMin: 0, scaleMax: 6 });
    expect(out).toHaveLength(1);
    expect(out[0]?.distanceM).toBe(18);
  });

  it('agrega la maxima cuando no cae justo en la grilla', () => {
    const out = printableSightMarks(model, [20, 30, 40], {
      from: 18,
      step: 3,
      scaleMin: 0,
      scaleMax: 6,
    });
    expect(out[out.length - 1]?.distanceM).toBe(40);
  });

  it('descarta las filas que se salen de la escala de la mira', () => {
    const out = printableSightMarks(model, [20, 30, 40], { scaleMin: 0, scaleMax: 1, from: 18 });
    expect(out.every((r) => r.scaleValue <= 1)).toBe(true);
    expect(out.length).toBeLessThan(12);
  });
});
