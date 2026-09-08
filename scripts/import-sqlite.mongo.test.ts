import Database from 'better-sqlite3';
import { MongoClient } from 'mongodb';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { cuentaDestino, main } from './import-sqlite.js';

/**
 * La migracion corriendo de verdad, contra un Mongo efimero **en replica set**.
 *
 * 🔴 Replica set y no un nodo suelto: el script escribe dentro de una
 * transaccion, y sin replica set esa transaccion no existe. Probarlo sin ella
 * seria probar otro programa.
 *
 * Se corre una sola vez sobre datos reales que no se pueden recuperar. Que la
 * traduccion este bien (`import-sqlite.test.ts`) no alcanza: falta saber que lo
 * traducido **llega entero** y que los conteos cierran.
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
const DB_NAME = 'bow_sight_import_test';
const EMAIL = 'braian@example.com';

let replSet: MongoMemoryReplSet;
let client: MongoClient;
let carpeta: string;
let ruta: string;
let uri: string;

/** Las cinco marcas del autor, en centimetros, como estaban en la app vieja. */
const MARCAS_CM: [distancia: number, escala: number][] = [
  [20, 4.1],
  [30, 12],
  [40, 21],
  [50, 32],
  [60, 45],
];

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  uri = replSet.getUri();
  client = new MongoClient(uri);
  await client.connect();

  carpeta = mkdtempSync(join(tmpdir(), 'bow-sight-import-mongo-'));
  ruta = join(carpeta, 'origen.db');

  const db = new Database(ruta);
  db.exec(SCHEMA);
  db.prepare(
    `INSERT INTO users (id, alias, password_hash, security_question_id, security_answer_hash, created_at)
     VALUES (1, 'braian', 'x', 1, 'y', ?)`,
  ).run(T);
  db.prepare(
    `INSERT INTO bow_setups (id, user_id, name, notes, created_at, updated_at)
     VALUES (1, 1, 'Hoyt RX-7', '', ?, ?)`,
  ).run(T, T);
  db.prepare(
    `INSERT INTO arrow_setups (id, user_id, name, notes, created_at, updated_at)
     VALUES (1, 1, 'X10 450', '', ?, ?)`,
  ).run(T, T);
  db.prepare(
    `INSERT INTO sight_configs
       (id, user_id, name, bow_setup_id, default_arrow_setup_id, scale_min, scale_max, created_at, updated_at)
     VALUES (1, 1, 'Shibuya', 1, 1, 0, 60, ?, ?)`,
  ).run(T, T);

  const marca = db.prepare(
    `INSERT INTO distances
       (sight_config_id, arrow_setup_id, scale_value, distance_m, created_at, updated_at)
     VALUES (1, 1, ?, ?, ?, ?)`,
  );
  for (const [distancia, escala] of MARCAS_CM) marca.run(escala, distancia, T, T);
  db.close();
});

afterAll(async () => {
  await client.close();
  await replSet.stop();
  rmSync(carpeta, { recursive: true, force: true });
});

afterEach(async () => {
  const db = client.db(DB_NAME);
  for (const nombre of ['user', 'bowSetup', 'arrowSet', 'sight', 'mark']) {
    await db.collection(nombre).deleteMany({});
  }
});

/** La cuenta que el arquero ya se creo por el camino normal. */
async function crearCuenta(opciones: { verificada?: boolean } = {}): Promise<string> {
  const _id = 'user-destino';
  await client
    .db(DB_NAME)
    .collection('user')
    .insertOne({
      _id: _id as never,
      email: EMAIL,
      name: 'Braian',
      emailVerified: opciones.verificada ?? false,
    });
  return _id;
}

async function correr(extra: string[] = []): Promise<void> {
  const argv = process.argv;
  process.argv = [
    'node',
    'x',
    '--db',
    ruta,
    '--email',
    EMAIL,
    '--uri',
    uri,
    '--db-name',
    DB_NAME,
    ...extra,
  ];
  try {
    await main();
  } finally {
    process.argv = argv;
  }
}

describe('la cuenta de destino', () => {
  it('🔴 sin cuenta creada, no inventa una', async () => {
    // Crear el usuario aca significaria inventarle una contraseña, o dejar una
    // cuenta sin credencial que nadie puede usar.
    await expect(cuentaDestino(client.db(DB_NAME), EMAIL, true)).rejects.toThrow(
      /no hay una cuenta con el email/,
    );
  });

  it('la deja verificada: el arquero ya demostro que es suya', async () => {
    const id = await crearCuenta({ verificada: false });

    expect(await cuentaDestino(client.db(DB_NAME), EMAIL, false)).toBe(id);
    const user = await client.db(DB_NAME).collection('user').findOne({ email: EMAIL });
    expect(user!['emailVerified']).toBe(true);
  });

  it('🔴 con --dry-run no toca nada, ni siquiera el flag de verificado', async () => {
    await crearCuenta({ verificada: false });
    await cuentaDestino(client.db(DB_NAME), EMAIL, true);

    const user = await client.db(DB_NAME).collection('user').findOne({ email: EMAIL });
    expect(user!['emailVerified']).toBe(false);
  });
});

describe('la migracion completa', () => {
  it('🔴 --dry-run no escribe una sola fila', async () => {
    await crearCuenta();
    await correr(['--dry-run']);

    for (const nombre of ['bowSetup', 'arrowSet', 'sight', 'mark']) {
      expect(await client.db(DB_NAME).collection(nombre).countDocuments()).toBe(0);
    }
  });

  it('lleva todo, en las colecciones que los indices esperan', async () => {
    // 🔴 Los nombres son los **singulares** de la spec §5.4.2, no los que
    // Mongoose pluralizaria: los indices unicos estan sobre esos.
    const userId = await crearCuenta();
    await correr();

    const db = client.db(DB_NAME);
    expect(await db.collection('bowSetup').countDocuments({ userId })).toBe(1);
    expect(await db.collection('arrowSet').countDocuments({ userId })).toBe(1);
    expect(await db.collection('sight').countDocuments({ userId })).toBe(1);
    expect(await db.collection('mark').countDocuments({ userId })).toBe(MARCAS_CM.length);
  });

  it('🔴 las cinco marcas llegan en milimetros, sin perder ni una', async () => {
    // Es el dato que importa: el historial de años del arquero.
    await crearCuenta();
    await correr();

    const marks = await client
      .db(DB_NAME)
      .collection('mark')
      .find({})
      .sort({ distanceM: 1 })
      .toArray();

    expect(marks.map((m) => [m['distanceM'], m['scaleValueMm']])).toEqual(
      MARCAS_CM.map(([distancia, escala]) => [distancia, Math.round(escala * 10)]),
    );
    expect(marks.every((m) => m['origin'] === 'measured')).toBe(true);
  });

  it('la mira queda enlazada a su arco y a su set', async () => {
    await crearCuenta();
    await correr();

    const db = client.db(DB_NAME);
    const sight = await db.collection('sight').findOne({});
    const bow = await db.collection('bowSetup').findOne({});
    const arrow = await db.collection('arrowSet').findOne({});

    expect(sight!['bowSetupId']).toBe(bow!._id);
    expect(sight!['defaultArrowSetId']).toBe(arrow!._id);
    expect(sight!['scaleMaxMm']).toBe(600);
    expect(sight!['scaleUnit']).toBe('cm');

    const marks = await db.collection('mark').find({}).toArray();
    expect(marks.every((m) => m['sightId'] === sight!._id)).toBe(true);
    expect(marks.every((m) => m['arrowSetId'] === arrow!._id)).toBe(true);
  });

  it('🔴 no migra sesiones: todos vuelven a entrar', async () => {
    await crearCuenta();
    await correr();

    // La app vieja tenia su propia tabla `sessions` con tokens opacos. Better
    // Auth firma los suyos con otra clave: importarlos seria dejar en la base
    // sesiones que nunca van a validar.
    expect(await client.db(DB_NAME).collection('session').countDocuments()).toBe(0);
  });

  it('sin cuenta de destino, se planta antes de escribir', async () => {
    await expect(correr()).rejects.toThrow(/no hay una cuenta con el email/);

    for (const nombre of ['bowSetup', 'arrowSet', 'sight', 'mark']) {
      expect(await client.db(DB_NAME).collection(nombre).countDocuments()).toBe(0);
    }
  });
});
