/**
 * Casos borde de la geometria de la regla.
 *
 * Los tests portados (`ruler.test.ts`) cubren el dibujo nominal. Aca van las
 * guardas: rangos invalidos, alturas nulas y la escala tan comprimida que hay
 * que empezar a esconder marcas para que siga siendo legible.
 */
import { describe, expect, it } from 'vitest';
import { generateTicks, layoutMarkers, scaleToY } from './ruler.js';

describe('scaleToY — guardas', () => {
  it('devuelve 0 con un rango invertido o degenerado', () => {
    expect(scaleToY(3, 6, 6, 400)).toBe(0);
    expect(scaleToY(3, 6, 2, 400)).toBe(0);
  });

  it('devuelve 0 si todavia no hay alto medido', () => {
    expect(scaleToY(3, 0, 6, 0)).toBe(0);
    expect(scaleToY(3, 0, 6, -10)).toBe(0);
  });
});

describe('generateTicks — guarda de densidad', () => {
  it('no dibuja nada con un rango o un alto invalido', () => {
    expect(generateTicks(6, 6, 400)).toEqual([]);
    expect(generateTicks(6, 2, 400)).toEqual([]);
    expect(generateTicks(0, 6, 0)).toEqual([]);
  });

  it('esconde las marcas de 1 mm cuando quedan demasiado juntas', () => {
    // 0-20 cm en 400 px => 2 px por mm: no entran las de 1 mm, si las de 5 mm.
    const ticks = generateTicks(0, 20, 400);
    expect(ticks.some((t) => t.size === 'sm')).toBe(false);
    expect(ticks.some((t) => t.size === 'md')).toBe(true);
    expect(ticks.some((t) => t.size === 'lg')).toBe(true);
  });

  it('con la escala muy comprimida deja solo los centimetros', () => {
    // 0-100 cm en 400 px => 0.4 px por mm: ni 1 mm ni 5 mm son legibles.
    const ticks = generateTicks(0, 100, 400);
    expect(ticks.every((t) => t.size === 'lg')).toBe(true);
    expect(ticks).toHaveLength(101);
    expect(ticks[0]?.label).toBe('0');
    expect(ticks[ticks.length - 1]?.label).toBe('100');
  });
});

describe('layoutMarkers — anti-solape', () => {
  it('sin marcadores devuelve una lista vacia', () => {
    expect(layoutMarkers([], 0, 6, 400)).toEqual([]);
  });

  it('empuja la etiqueta hacia abajo pero conserva la posicion real', () => {
    // Dos marcas casi pegadas: 1.00 y 1.02 cm.
    const [a, b] = layoutMarkers(
      [
        { id: 1, scaleValue: 1.0, distanceM: 20 },
        { id: 2, scaleValue: 1.02, distanceM: 21 },
      ],
      0,
      6,
      400,
      22,
    );

    expect(a?.labelY).toBe(a?.anchorY);
    // La segunda etiqueta se corre; el ancla no se mueve.
    expect(b?.labelY).toBeGreaterThan(b?.anchorY ?? 0);
    expect(b!.labelY - a!.labelY).toBeGreaterThanOrEqual(22);
  });

  it('ordena por posicion aunque lleguen desordenadas', () => {
    const out = layoutMarkers(
      [
        { id: 1, scaleValue: 4, distanceM: 50 },
        { id: 2, scaleValue: 1, distanceM: 20 },
        { id: 3, scaleValue: 2.5, distanceM: 35 },
      ],
      0,
      6,
      400,
    );
    expect(out.map((m) => m.id)).toEqual([2, 3, 1]);
  });
});
