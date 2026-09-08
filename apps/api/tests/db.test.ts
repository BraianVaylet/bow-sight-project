import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createReadinessCheck, supportsTransactions } from '../src/db/connection.js';
import { startTestMongo, type TestMongo } from './mongo.js';

const MIGRATIONS_DIR = join(process.cwd(), '../../migrations');

interface Migration {
  up: (db: unknown) => Promise<void>;
  down: (db: unknown) => Promise<void>;
}

/** Corre todas las migraciones en orden, igual que `migrate-mongo up`. */
async function runMigrations(db: unknown, direction: 'up' | 'down' = 'up') {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.cjs'))
    .sort();
  const ordered = direction === 'up' ? files : [...files].reverse();

  for (const file of ordered) {
    const loaded = (await import(`file://${join(MIGRATIONS_DIR, file)}`)) as {
      default: Migration;
    };
    await loaded.default[direction](db);
  }
  return files;
}

let mongo: TestMongo;

beforeAll(async () => {
  mongo = await startTestMongo();
}, 180_000);

afterAll(async () => {
  await mongo?.stop();
});

describe('conexion', () => {
  it('🔴 el deployment soporta transacciones: sin replica set no hay cobro atomico', async () => {
    await expect(supportsTransactions(mongo.connection)).resolves.toBe(true);
  });

  it('el chequeo de readiness hace un ping real, no mira el readyState', async () => {
    const isReady = createReadinessCheck(mongo.connection);
    await expect(isReady()).resolves.toBe(true);
  });
});

describe('transacciones', () => {
  it('🔴 una transaccion que falla a mitad no deja nada escrito', async () => {
    // Es la garantia que sostiene el procesamiento de webhooks: escribir el
    // evento, actualizar la suscripcion y tocar el plan, o nada.
    const db = mongo.connection.db!;
    await db.collection('prueba_tx').deleteMany({});

    const session = mongo.connection.getClient().startSession();
    await expect(
      session.withTransaction(async () => {
        await db.collection('prueba_tx').insertOne({ paso: 1 }, { session });
        await db.collection('prueba_tx').insertOne({ paso: 2 }, { session });
        throw new Error('el cobro fallo despues de escribir');
      }),
    ).rejects.toThrow('el cobro fallo');
    await session.endSession();

    await expect(db.collection('prueba_tx').countDocuments()).resolves.toBe(0);
  });
});

describe('migraciones', () => {
  beforeAll(async () => {
    await runMigrations(mongo.connection.db);
  });

  it('correrlas dos veces no rompe', async () => {
    // migrate-mongo no las repite, pero una migracion que no es idempotente es
    // una bomba para cualquier reintento de deploy.
    await expect(runMigrations(mongo.connection.db)).resolves.toBeDefined();
  });

  it('🔴 el userId va primero en todo indice compuesto de datos del arquero', async () => {
    const db = mongo.connection.db!;

    for (const coleccion of ['bowSetup', 'arrowSet', 'sight', 'mark']) {
      const indices = await db.collection(coleccion).indexes();
      const compuestos = indices.filter((i) => Object.keys(i.key).length > 1 && i.name !== '_id_');
      expect(compuestos.length, `${coleccion} no tiene indices compuestos`).toBeGreaterThan(0);

      for (const indice of compuestos) {
        expect(Object.keys(indice.key)[0], `${coleccion}.${indice.name}`).toBe('userId');
      }
    }
  });

  it('el email es unico e insensible a mayusculas', async () => {
    const users = mongo.connection.db!.collection('user');
    await users.deleteMany({});
    await users.insertOne({ email: 'braian@example.com' });

    // La misma persona escrita distinto no puede tener dos cuentas.
    await expect(users.insertOne({ email: 'Braian@Example.com' })).rejects.toThrow(
      /duplicate key/i,
    );
  });

  it('una marca borrada libera su distancia para poder recargarla', async () => {
    const marks = mongo.connection.db!.collection('mark');
    await marks.deleteMany({});
    const base = { userId: 'u1', sightId: 's1', arrowSetId: 'a1', distanceM: 30 };

    await marks.insertOne({ ...base, deletedAt: null });
    await expect(marks.insertOne({ ...base, deletedAt: null })).rejects.toThrow(/duplicate key/i);

    // El soft delete no puede dejar la distancia reservada para siempre.
    await marks.updateOne(base, { $set: { deletedAt: new Date() } });
    await expect(marks.insertOne({ ...base, deletedAt: null })).resolves.toBeDefined();
  });

  it('un evento de cobro repetido choca contra su indice: es el store de idempotencia', async () => {
    const eventos = mongo.connection.db!.collection('billingEvent');
    await eventos.deleteMany({});

    await eventos.insertOne({ provider: 'stripe', eventId: 'evt_1' });
    await expect(eventos.insertOne({ provider: 'stripe', eventId: 'evt_1' })).rejects.toThrow(
      /duplicate key/i,
    );
    // Otro proveedor con el mismo id es otro evento.
    await expect(
      eventos.insertOne({ provider: 'mercadopago', eventId: 'evt_1' }),
    ).resolves.toBeDefined();
  });

  it('solo puede haber una suscripcion viva por usuario', async () => {
    const subs = mongo.connection.db!.collection('subscription');
    await subs.deleteMany({});

    await subs.insertOne({ userId: 'u1', status: 'active' });
    await expect(subs.insertOne({ userId: 'u1', status: 'trialing' })).rejects.toThrow(
      /duplicate key/i,
    );
    // Las canceladas quedan como historia y no ocupan el lugar.
    await expect(subs.insertOne({ userId: 'u1', status: 'canceled' })).resolves.toBeDefined();
  });

  it('bajar las migraciones deja la base sin sus indices, y volver a subirlas la restaura', async () => {
    await runMigrations(mongo.connection.db, 'down');
    const sinIndices = await mongo.connection.db!.collection('mark').indexes();
    expect(sinIndices.map((i) => i.name)).not.toContain('mark_user_sight_arrowset_distance_unique');

    await runMigrations(mongo.connection.db);
    const conIndices = await mongo.connection.db!.collection('mark').indexes();
    expect(conIndices.map((i) => i.name)).toContain('mark_user_sight_arrowset_distance_unique');
  });
});

describe('caminos de falla de la conexion', () => {
  it('el readiness da false si el driver todavia no tiene db', async () => {
    // Pasa mientras la conexion se esta abriendo: `/ready` tiene que decir "no
    // estoy listo", no explotar.
    const isReady = createReadinessCheck({ db: undefined } as never);
    await expect(isReady()).resolves.toBe(false);
  });

  it('supportsTransactions da false, no lanza, si el comando falla', async () => {
    const fake = {
      db: {
        admin: () => ({
          command: async () => {
            throw new Error('sin permisos para hello');
          },
        }),
      },
    } as never;
    await expect(supportsTransactions(fake)).resolves.toBe(false);
  });

  it('supportsTransactions reconoce un cluster sharded', async () => {
    const sharded = {
      db: { admin: () => ({ command: async () => ({ msg: 'isdbgrid' }) }) },
    } as never;
    await expect(supportsTransactions(sharded)).resolves.toBe(true);
  });

  it('supportsTransactions da false en un standalone', async () => {
    // Es el caso que hay que detectar: parece que anda hasta el primer cobro.
    const standalone = { db: { admin: () => ({ command: async () => ({}) }) } } as never;
    await expect(supportsTransactions(standalone)).resolves.toBe(false);
  });

  it('supportsTransactions da false si no hay db', async () => {
    await expect(supportsTransactions({ db: undefined } as never)).resolves.toBe(false);
  });
});

describe('nombres de coleccion', () => {
  it('🔴 los modelos escriben en las colecciones que indexan las migraciones', async () => {
    // Regresion: Mongoose pluraliza por defecto, asi que el modelo `mark`
    // escribia en `marks` mientras la migracion indexaba `mark`. Los unicos
    // —incluido el de idempotencia de los webhooks— quedaban sobre colecciones
    // que nadie usa, y eso no se nota hasta el primer duplicado en produccion.
    const { createModules } = await import('../src/modules/index.js');
    const { systemClock } = await import('../src/persistence/clock.js');
    const modules = createModules({ connection: mongo.connection, now: systemClock });

    const usadas = new Set(
      Object.values(mongo.connection.models).map((m) => m.collection.collectionName),
    );

    // Las que la migracion indexa para datos del arquero.
    for (const esperada of ['bowSetup', 'arrowSet', 'sight', 'mark']) {
      expect(usadas, `ningun modelo escribe en ${esperada}`).toContain(esperada);
    }
    expect(modules.routes).toBeDefined();
  });
});
