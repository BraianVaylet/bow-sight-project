import { ApiError } from '@bow-sight/client';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useErrorText } from './errorText.js';

function textOf(): (error: ApiError) => string {
  return renderHook(() => useErrorText()).result.current;
}

function error(messageKey: string, params?: Record<string, string | number>): ApiError {
  return new ApiError({ status: 400, code: 'BS-MARK-400-001', messageKey, params });
}

describe('el puente de traduccion', () => {
  it('traduce una clave conocida', () => {
    expect(textOf()(error('errors.auth.invalidCredentials'))).toBe(
      'Email o contraseña incorrectos.',
    );
  });

  it('interpola los params que manda la API', () => {
    // La API manda clave + params y nunca prosa (ADR-005): si los params se
    // perdieran, el arquero leeria "cargá undefined marcas más".
    expect(textOf()(error('errors.mark.notEnoughMarks', { need: 5, have: 2 }))).toContain('3');
    expect(textOf()(error('errors.mark.outOfScale', { min: 0, max: 60 }))).toContain('0 y 60');
    expect(textOf()(error('errors.mark.duplicateDistance', { distanceM: 30 }))).toContain('30 m');
  });

  it('una clave con params, sin params, no rompe la pantalla', () => {
    // Un error del servidor no puede dejar en blanco la unica pantalla que
    // explica que paso.
    expect(() => textOf()(error('errors.sight.marksOutsideNewRange'))).not.toThrow();
  });

  it('🔴 un error de validacion dice cual campo, no "revisá los datos"', () => {
    // La API manda `params.field`. Tirarlo deja al arquero adivinando: fue justo
    // lo que paso al registrarse con una contraseña de menos de 12 caracteres.
    const t = textOf();
    expect(t(error('errors.system.validation', { field: 'password' }))).toMatch(/12 caracteres/);
    expect(t(error('errors.system.validation', { field: 'email' }))).toMatch(/email/i);
    expect(t(error('errors.system.validation', { field: 'name' }))).toMatch(/nombre/i);
  });

  it('un campo que no tiene texto propio cae en el generico, no en el codigo', () => {
    expect(textOf()(error('errors.system.validation', { field: 'locale' }))).toBe(
      'Revisá los datos: hay algo que no cierra.',
    );
  });

  it('🔴 una clave sin traducir cae en el codigo, no en una pantalla muda', () => {
    const sinTraducir = new ApiError({
      status: 500,
      code: 'BS-SYS-500-005',
      messageKey: 'errors.inventado',
    });
    expect(textOf()(sinTraducir)).toBe('Algo salió mal (BS-SYS-500-005).');
  });

  it('🔴 cubre todas las claves que la API puede mandar hoy', () => {
    // Es la razon de ser de este archivo. Una clave nueva en la API sin su
    // texto aca sale a produccion como "Algo salió mal (BS-…)", que es
    // exactamente la pantalla que este puente existe para evitar.
    //
    // Las claves se leen del **codigo de la API**, no de una lista copiada:
    // una lista copiada se desactualiza en silencio, y el sintoma aparece
    // recien cuando un arquero ve un codigo en vez de una explicacion.
    const apiSrc = resolve(process.cwd(), '../api/src');
    const fuentes = readdirSync(apiSrc, { recursive: true, encoding: 'utf8' }).filter(
      (f) => f.endsWith('.ts') && !f.includes('.test.'),
    );

    const claves = new Set<string>();
    for (const archivo of fuentes) {
      const texto = readFileSync(resolve(apiSrc, archivo), 'utf8');
      for (const m of texto.matchAll(/'(errors\.[a-zA-Z.]+)'/g)) claves.add(m[1]!);
    }
    // Las dos que nacen en el cliente, no en la API.
    claves.add('errors.network.offline');
    claves.add('errors.system.internal');

    expect(claves.size).toBeGreaterThan(20);

    const t = textOf();
    const sinTexto = [...claves]
      .filter((clave) =>
        t(new ApiError({ status: 400, code: 'BS-SYS-400-001', messageKey: clave })).startsWith(
          'Algo salió mal',
        ),
      )
      .sort();

    expect(sinTexto).toEqual([]);
  });
});
