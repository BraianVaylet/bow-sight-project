import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose, { type Connection } from 'mongoose';
import pino from 'pino';
import { connectDatabase } from '../src/db/connection.js';

/**
 * Mongo efimero para los tests, **en modo replica set**.
 *
 * 🔴 No es un detalle de configuracion: sin replica set no hay transacciones, y
 * la mitad de lo que hay que probar —que un cobro a medias no deja nada
 * escrito— no se puede probar sin ellas.
 */
export interface TestMongo {
  connection: Connection;
  uri: string;
  stop: () => Promise<void>;
}

export async function startTestMongo(): Promise<TestMongo> {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const uri = replSet.getUri();

  const connection = await connectDatabase({
    uri,
    dbName: 'bow_sight_test',
    logger: pino({ level: 'silent' }),
  });

  return {
    connection,
    uri,
    stop: async () => {
      await connection.close();
      await replSet.stop();
      // Sin esto, Vitest se queda esperando handles abiertos de mongoose.
      await mongoose.disconnect();
    },
  };
}
