import { describe, expect, it } from 'vitest';
import { arrowSetCreateSchema, bowSetupCreateSchema } from './equipment/index.js';
import { markCreateSchema, markQuerySchema, markUpdateSchema } from './marks/index.js';
import { sightCreateSchema, sightUpdateSchema } from './sights/index.js';

const ID = '018f5a3c-0000-7000-8000-000000000001';

/** Primera clave de error, para no repetir el desarmado en cada test. */
function firstKey(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe('mira', () => {
  const valida = { id: ID, name: 'Ultraview / Evo', scaleMinMm: 0, scaleMaxMm: 60 };

  it('acepta una mira valida y pone cm por defecto', () => {
    const result = sightCreateSchema.safeParse(valida);
    expect(result.success).toBe(true);
    expect(result.data?.scaleUnit).toBe('cm');
  });

  it('🔴 rechaza un rango invertido o degenerado', () => {
    expect(
      firstKey(sightCreateSchema.safeParse({ ...valida, scaleMinMm: 60, scaleMaxMm: 0 })),
    ).toBe('validation.sight.badScaleRange');
    expect(
      firstKey(sightCreateSchema.safeParse({ ...valida, scaleMinMm: 30, scaleMaxMm: 30 })),
    ).toBe('validation.sight.badScaleRange');
  });

  it('🔴 una escala en clicks sin tamaño de click no significa nada', () => {
    expect(firstKey(sightCreateSchema.safeParse({ ...valida, scaleUnit: 'click' }))).toBe(
      'validation.sight.missingClickSize',
    );
    expect(
      sightCreateSchema.safeParse({ ...valida, scaleUnit: 'click', clickSizeMm: 0.5 }).success,
    ).toBe(true);
  });

  it('la regla del rango tambien se aplica al editar', () => {
    expect(firstKey(sightUpdateSchema.safeParse({ scaleMinMm: 60, scaleMaxMm: 10 }))).toBe(
      'validation.sight.badScaleRange',
    );
    // Editar solo el nombre no dispara la regla del rango.
    expect(sightUpdateSchema.safeParse({ name: 'Otra' }).success).toBe(true);
  });

  it('🔴 los mensajes son claves, no prosa', () => {
    const key = firstKey(sightCreateSchema.safeParse({ ...valida, scaleMaxMm: 99999 }));
    expect(key).toBe('validation.scale.tooHigh');
    expect(key).not.toMatch(/\s/);
  });
});

describe('marca', () => {
  const valida = { id: ID, arrowSetId: ID, distanceM: 30, scaleValueMm: 12 };

  it('acepta una marca valida y la marca como medida', () => {
    const result = markCreateSchema.safeParse(valida);
    expect(result.success).toBe(true);
    expect(result.data?.origin).toBe('measured');
  });

  it('🔴 el cliente no puede crear una marca calculada ni sembrada', () => {
    // `computed` la hace el modelo y `seeded` la balistica: ninguna se guarda
    // como si el arquero la hubiera tirado.
    expect(markCreateSchema.safeParse({ ...valida, origin: 'computed' }).success).toBe(false);
    expect(markCreateSchema.safeParse({ ...valida, origin: 'seeded' }).success).toBe(false);
  });

  it('rechaza una distancia de cero o negativa', () => {
    expect(firstKey(markCreateSchema.safeParse({ ...valida, distanceM: 0 }))).toBe(
      'validation.mark.distanceTooLow',
    );
    expect(markCreateSchema.safeParse({ ...valida, distanceM: -5 }).success).toBe(false);
  });

  it('rechaza una distancia absurda', () => {
    expect(firstKey(markCreateSchema.safeParse({ ...valida, distanceM: 5000 }))).toBe(
      'validation.mark.distanceTooHigh',
    );
  });

  it('acepta condiciones opcionales', () => {
    const result = markCreateSchema.safeParse({
      ...valida,
      conditions: { tempC: 8, altitudeM: 1200 },
    });
    expect(result.success).toBe(true);
  });

  it('la edicion lleva el updatedAt que vio el cliente, para detectar conflictos', () => {
    const result = markUpdateSchema.safeParse({
      scaleValueMm: 13,
      baseUpdatedAt: '2026-09-07T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('la consulta acepta un angulo, y solo dentro de lo que se puede tirar', () => {
    expect(
      markQuerySchema.safeParse({ arrowSetId: ID, distanceM: 37, angleDeg: -25 }).success,
    ).toBe(true);
    expect(markQuerySchema.safeParse({ arrowSetId: ID, distanceM: 37, angleDeg: 89 }).success).toBe(
      false,
    );
  });

  it('la consulta convierte lo que viene de la query string', () => {
    const result = markQuerySchema.safeParse({ arrowSetId: ID, distanceM: '37.5' });
    expect(result.data?.distanceM).toBe(37.5);
  });
});

describe('equipo', () => {
  it('un set de flechas solo necesita nombre: nadie tiene cronografo', () => {
    expect(arrowSetCreateSchema.safeParse({ id: ID, name: 'VAP V1 400' }).success).toBe(true);
  });

  it('acepta las specs completas', () => {
    const result = arrowSetCreateSchema.safeParse({
      id: ID,
      name: 'VAP V1 400',
      spine: 400,
      pointGrains: 100,
      lengthIn: 28.5,
      totalGrains: 380,
      speedFps: 285,
      vaneColor: 'red',
    });
    expect(result.success).toBe(true);
  });

  it('acota lo absurdo sin acotar lo raro', () => {
    // 285 fps es normal; 2000 fps no existe.
    expect(arrowSetCreateSchema.safeParse({ id: ID, name: 'x', speedFps: 2000 }).success).toBe(
      false,
    );
    expect(arrowSetCreateSchema.safeParse({ id: ID, name: 'x', speedFps: 340 }).success).toBe(true);
  });

  it('un setup de arco tambien vive con solo el nombre', () => {
    expect(bowSetupCreateSchema.safeParse({ id: ID, name: 'Evo NXT 35' }).success).toBe(true);
  });

  it('rechaza un id que no es UUID: los genera el cliente pero tienen forma', () => {
    expect(bowSetupCreateSchema.safeParse({ id: '123', name: 'x' }).success).toBe(false);
  });

  it('recorta los espacios del nombre y rechaza el vacio', () => {
    expect(bowSetupCreateSchema.safeParse({ id: ID, name: '  Evo  ' }).data?.name).toBe('Evo');
    expect(bowSetupCreateSchema.safeParse({ id: ID, name: '   ' }).success).toBe(false);
  });
});
