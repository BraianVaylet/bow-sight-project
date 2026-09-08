import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { modelOn, ownedSchema, VIVOS } from '../src/persistence/base.js';
import { bypassOwnership, MissingOwnerFilterError } from '../src/persistence/ownership.js';
import { startTestMongo, type TestMongo } from './mongo.js';

let mongo: TestMongo;
let Prueba: ReturnType<typeof modelOn<{ nombre: string }>>;

beforeAll(async () => {
  mongo = await startTestMongo();
  Prueba = modelOn<{ nombre: string }>(
    mongo.connection,
    'PruebaOwnership',
    ownedSchema('pruebaOwnership', { nombre: { type: String, required: true } }),
  );
}, 180_000);

afterAll(async () => {
  await mongo?.stop();
});

beforeEach(async () => {
  await Prueba.deleteMany({}, bypassOwnership);
});

async function sembrar() {
  await Prueba.create({ _id: 'a', userId: 'arquero-1', nombre: 'mia' });
  await Prueba.create({ _id: 'b', userId: 'arquero-2', nombre: 'ajena' });
}

describe('ownershipGuard — la red de seguridad', () => {
  it('🔴 una lectura sin userId falla en vez de devolver los datos de todos', async () => {
    await sembrar();
    await expect(Prueba.find({}).exec()).rejects.toThrow(MissingOwnerFilterError);
    await expect(Prueba.findOne({ nombre: 'mia' }).exec()).rejects.toThrow(MissingOwnerFilterError);
  });

  it('🔴 una escritura sin userId tambien falla', async () => {
    await sembrar();
    await expect(Prueba.updateMany({}, { $set: { nombre: 'x' } }).exec()).rejects.toThrow(
      MissingOwnerFilterError,
    );
    await expect(Prueba.deleteMany({ nombre: 'mia' }).exec()).rejects.toThrow(
      MissingOwnerFilterError,
    );
  });

  it('con userId, la consulta pasa y solo trae lo del arquero', async () => {
    await sembrar();
    const mias = await Prueba.find({ userId: 'arquero-1', ...VIVOS }).exec();

    expect(mias).toHaveLength(1);
    expect(mias[0]?.nombre).toBe('mia');
  });

  it('un userId nulo no cuenta como filtro: es el bug que la capa existe para atrapar', async () => {
    await sembrar();
    await expect(Prueba.find({ userId: null }).exec()).rejects.toThrow(MissingOwnerFilterError);
    await expect(Prueba.find({ userId: undefined }).exec()).rejects.toThrow(
      MissingOwnerFilterError,
    );
  });

  it('el bypass es explicito y se ve en el diff', async () => {
    await sembrar();
    // Es lo que usan las migraciones, los jobs y la lectura ya autorizada de un
    // coach. Escribirlo es declarar que se penso.
    const todas = await Prueba.find({}, null, bypassOwnership).exec();
    expect(todas).toHaveLength(2);
  });

  it('el mensaje dice donde fue y a que regla pertenece', async () => {
    await expect(Prueba.countDocuments({}).exec()).rejects.toThrow(/ADR-000/);
    await expect(Prueba.countDocuments({}).exec()).rejects.toThrow(/pruebaOwnership/i);
  });
});

describe('ownedSchema', () => {
  it('rechaza escribir un campo que el schema no declara', async () => {
    await expect(
      Prueba.create({ _id: 'c', userId: 'u', nombre: 'x', planCode: 'max' }),
    ).rejects.toThrow();
  });

  it('el soft delete deja el documento y lo saca de los listados vivos', async () => {
    await Prueba.create({ _id: 'd', userId: 'u', nombre: 'x' });
    await Prueba.updateOne({ _id: 'd', userId: 'u' }, { $set: { deletedAt: new Date() } }).exec();

    await expect(Prueba.countDocuments({ userId: 'u', ...VIVOS }).exec()).resolves.toBe(0);
    // Pero sigue estando: el soft delete no pierde nada.
    await expect(Prueba.countDocuments({ userId: 'u' }).exec()).resolves.toBe(1);
  });

  it('pone createdAt y updatedAt solo', async () => {
    const doc = await Prueba.create({ _id: 'e', userId: 'u', nombre: 'x' });
    expect(doc.createdAt).toBeInstanceOf(Date);
    expect(doc.updatedAt).toBeInstanceOf(Date);
    expect(doc.deletedAt).toBeNull();
  });

  it('el _id es el string que mando el cliente, no un ObjectId', async () => {
    const id = '018f5a3c-0000-7000-8000-000000000001';
    const doc = await Prueba.create({ _id: id, userId: 'u', nombre: 'x' });
    expect(doc._id).toBe(id);
  });
});
