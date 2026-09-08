import Database from 'better-sqlite3';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cmAMm, leerSqlite, parseArgs, traducir, type FilasOrigen } from './import-sqlite.js';

/**
 * La migracion se corre **una sola vez**, en la base real del autor. Eso la hace
 * imposible de arreglar despues: si convierte mal, lo que se pierde es el
 * historial de marcas de años. Por eso se prueba contra una SQLite de verdad,
 * con el schema real de `bv-bow-sight`, y no contra un objeto inventado.
 */
const SCHEMA = `
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, alias TEXT NOT NULL COLLATE NOCASE,
  password_hash TEXT NOT NULL, security_question_id INTEGER NOT NULL,
  security_answer_hash TEXT NOT NULL, failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER, created_at INTEGER NOT NULL);
CREATE TABLE bow_setups (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL,
  notes TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE arrow_setups (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL,
  notes TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE sight_configs (
  id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL,
  bow_setup_id INTEGER, default_arrow_setup_id INTEGER, scale_min REAL NOT NULL,
  scale_max REAL NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE TABLE distances (
  id INTEGER PRIMARY KEY AUTOINCREMENT, sight_config_id INTEGER NOT NULL,
  arrow_setup_id INTEGER NOT NULL, scale_value REAL NOT NULL, distance_m REAL NOT NULL,
  notes TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
`;

const T = 1_700_000_000;
let carpeta: string;
let ruta: string;

beforeAll(() => {
  carpeta = mkdtempSync(join(tmpdir(), 'bow-sight-import-'));
  ruta = join(carpeta, 'origen.db');

  const db = new Database(ruta);
  db.exec(SCHEMA);

  db.prepare(
    `INSERT INTO users (id, alias, password_hash, security_question_id, security_answer_hash, created_at)
     VALUES (1, 'braian', 'x', 1, 'y', ?), (2, 'otro', 'x', 1, 'y', ?)`,
  ).run(T, T);

  db.prepare(
    `INSERT INTO bow_setups (id, user_id, name, notes, created_at, updated_at)
     VALUES (1, 1, 'Hoyt RX-7', 'compuesto', ?, ?), (9, 2, 'De otro', '', ?, ?)`,
  ).run(T, T, T, T);

  db.prepare(
    `INSERT INTO arrow_setups (id, user_id, name, notes, created_at, updated_at)
     VALUES (1, 1, 'X10 450', '', ?, ?), (2, 1, 'Entrenamiento', 'mas pesadas', ?, ?)`,
  ).run(T, T, T, T);

  db.prepare(
    `INSERT INTO sight_configs
       (id, user_id, name, bow_setup_id, default_arrow_setup_id, scale_min, scale_max, created_at, updated_at)
     VALUES (1, 1, 'Shibuya', 1, 1, 0, 60, ?, ?),
            (2, 1, 'Sin arco', NULL, NULL, 0, 45, ?, ?),
            (8, 2, 'De otro', 9, NULL, 0, 60, ?, ?)`,
  ).run(T, T, T, T, T, T);

  // 4.1 cm es el caso que rompe: 4.1 * 10 en punto flotante da 41.00000000000001.
  db.prepare(
    `INSERT INTO distances
       (id, sight_config_id, arrow_setup_id, scale_value, distance_m, notes, created_at, updated_at)
     VALUES (1, 1, 1, 4.1, 20, NULL, ?, ?),
            (2, 1, 1, 12.0, 30, 'con viento', ?, ?),
            (3, 1, 2, 13.5, 30, NULL, ?, ?),
            (7, 8, 1, 9.9, 25, NULL, ?, ?)`,
  ).run(T, T, T, T, T, T, T, T);

  db.close();
});

afterAll(() => rmSync(carpeta, { recursive: true, force: true }));

/** Ids predecibles: el test verifica el mapeo, no la aleatoriedad. */
function contador(): () => string {
  let n = 0;
  return () => `id-${++n}`;
}

describe('los argumentos', () => {
  const conexion = ['--uri', 'mongodb://x', '--db-name', 'bow_sight'];

  it('toma la base, el email y la conexion', () => {
    const args = parseArgs(['--db', './copia.db', '--email', 'Braian@Example.com', ...conexion]);

    expect(args.db).toBe('./copia.db');
    expect(args.email).toBe('Braian@Example.com');
    expect(args.dryRun).toBe(false);
    expect(args.alias).toBeUndefined();
  });

  it('--dry-run y --alias son opcionales', () => {
    const args = parseArgs([
      '--db',
      './copia.db',
      '--email',
      'b@e.com',
      '--alias',
      'braian',
      '--dry-run',
      ...conexion,
    ]);

    expect(args.dryRun).toBe(true);
    expect(args.alias).toBe('braian');
  });

  it('🔴 sin --db o sin --email no arranca', () => {
    // Una migracion que adivina cual base leer o a que cuenta escribir es una
    // que puede escribir los datos de una persona abajo de otra.
    expect(() => parseArgs([...conexion])).toThrow(/faltan --db y --email/);
    expect(() => parseArgs(['--db', 'x', ...conexion])).toThrow(/faltan --db y --email/);
    expect(() => parseArgs(['--email', 'b@e.com', ...conexion])).toThrow(/faltan --db y --email/);
  });

  it('sin datos de conexion tampoco', () => {
    expect(() => parseArgs(['--db', 'x', '--email', 'b@e.com'])).toThrow(/MONGODB_URI/);
  });
});

describe('cmAMm', () => {
  it('🔴 no arrastra basura de punto flotante', () => {
    // Sin el redondeo, 41.00000000000001 termina impreso en la regla.
    expect(cmAMm(4.1)).toBe(41);
    expect(cmAMm(1.15)).toBe(12);
    expect(cmAMm(0)).toBe(0);
    expect(cmAMm(60)).toBe(600);
  });
});

describe('leer el origen', () => {
  it('🔴 trae solo las filas del arquero que se migra', () => {
    // La base vieja es multiusuario. Migrar de mas seria meter los datos de otra
    // persona abajo de esta cuenta (ADR-000).
    const filas = leerSqlite(ruta, 'braian');

    expect(filas.bowSetups.map((b) => b.name)).toEqual(['Hoyt RX-7']);
    expect(filas.sightConfigs.map((s) => s.name)).toEqual(['Shibuya', 'Sin arco']);
    expect(filas.distances.map((d) => d.id)).toEqual([1, 2, 3]);
  });

  it('el alias no distingue mayusculas: la columna es COLLATE NOCASE', () => {
    expect(leerSqlite(ruta, 'BRAIAN').bowSetups).toHaveLength(1);
  });

  it('🔴 con varios usuarios y sin --alias, se planta', () => {
    // Elegir uno "por defecto" seria migrar los datos de quien la suerte quiera.
    expect(() => leerSqlite(ruta)).toThrow(/pasá --alias/);
  });

  it('un alias que no existe lo dice', () => {
    expect(() => leerSqlite(ruta, 'nadie')).toThrow(/no hay un usuario con alias/);
  });
});

describe('traducir', () => {
  const filas = (): FilasOrigen => leerSqlite(ruta, 'braian');

  it('cada fila del origen sale como un documento', () => {
    const docs = traducir(filas(), 'u1', contador());

    expect(docs.bowSetup).toHaveLength(1);
    expect(docs.arrowSet).toHaveLength(2);
    expect(docs.sight).toHaveLength(2);
    expect(docs.mark).toHaveLength(3);
  });

  it('🔴 todo queda abajo del userId de destino, sin excepcion', () => {
    const docs = traducir(filas(), 'u1', contador());
    const todos = [...docs.bowSetup, ...docs.arrowSet, ...docs.sight, ...docs.mark];

    expect(todos.every((d) => d['userId'] === 'u1')).toBe(true);
    expect(todos.every((d) => d['deletedAt'] === null)).toBe(true);
  });

  it('🔴 la escala pasa de centimetros a milimetros', () => {
    const docs = traducir(filas(), 'u1', contador());
    const shibuya = docs.sight.find((s) => s['name'] === 'Shibuya')!;

    expect(shibuya['scaleMinMm']).toBe(0);
    expect(shibuya['scaleMaxMm']).toBe(600);
    expect(shibuya['scaleUnit']).toBe('cm');

    expect(docs.mark.map((m) => m['scaleValueMm'])).toEqual([41, 120, 135]);
    // La distancia ya estaba en metros: no se toca.
    expect(docs.mark.map((m) => m['distanceM'])).toEqual([20, 30, 30]);
  });

  it('🔴 las referencias apuntan a los ids nuevos, no a los enteros viejos', () => {
    const docs = traducir(filas(), 'u1', contador());
    const shibuya = docs.sight.find((s) => s['name'] === 'Shibuya')!;
    const arco = docs.bowSetup[0]!;

    expect(shibuya['bowSetupId']).toBe(arco['_id']);
    expect(shibuya['defaultArrowSetId']).toBe(docs.arrowSet[0]!['_id']);
    expect(docs.mark.every((m) => m['sightId'] === shibuya['_id'])).toBe(true);
    // La tercera marca usa el segundo set: si el mapa estuviera mal, apuntarian
    // todas al mismo y nadie lo notaria hasta ver la curva.
    expect(docs.mark[2]!['arrowSetId']).toBe(docs.arrowSet[1]!['_id']);
  });

  it('una mira sin arco queda sin arco, no con uno inventado', () => {
    const docs = traducir(filas(), 'u1', contador());
    const suelta = docs.sight.find((s) => s['name'] === 'Sin arco')!;

    expect(suelta['bowSetupId']).toBeNull();
    expect(suelta['defaultArrowSetId']).toBeNull();
  });

  it('🔴 todo lo migrado es `measured`', () => {
    // Lo que hay en la base vieja lo tiro el arquero. Marcarlo de otra forma
    // seria decirle que una marca suya es una estimacion nuestra (ADR-001).
    const docs = traducir(filas(), 'u1', contador());
    expect(docs.mark.every((m) => m['origin'] === 'measured')).toBe(true);
  });

  it('conserva las fechas del origen, no la de la migracion', () => {
    const docs = traducir(filas(), 'u1', contador());
    expect((docs.mark[0]!['createdAt'] as Date).getTime()).toBe(T * 1000);
  });

  it('las notas vacias no se guardan como cadena vacia', () => {
    const docs = traducir(filas(), 'u1', contador());
    expect(docs.arrowSet[0]).not.toHaveProperty('notes');
    expect(docs.arrowSet[1]!['notes']).toBe('mas pesadas');
    expect(docs.mark[1]!['notes']).toBe('con viento');
  });

  it('🔴 una marca huerfana corta la migracion, no se importa a medias', () => {
    const rotas: FilasOrigen = {
      ...filas(),
      distances: [
        {
          id: 99,
          sight_config_id: 404,
          arrow_setup_id: 1,
          scale_value: 5,
          distance_m: 20,
          notes: null,
          created_at: T,
          updated_at: T,
        },
      ],
    };

    expect(() => traducir(rotas, 'u1', contador())).toThrow(/no se migro/);
  });
});
