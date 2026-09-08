import mongoose, { type Connection } from 'mongoose';
import type { Logger } from 'pino';

export interface ConnectOptions {
  uri: string;
  dbName: string;
  logger: Logger;
}

/**
 * Conecta a MongoDB.
 *
 * 🔴 **Replica set obligatorio.** Las transacciones que usa el procesamiento de
 * webhooks —escribir el evento, actualizar la suscripcion y tocar el plan del
 * usuario en una sola operacion— no existen sin el. Un cluster standalone hace
 * fallar esos flujos en runtime, no en el build, que es la peor forma de
 * enterarse.
 */
export async function connectDatabase({
  uri,
  dbName,
  logger,
}: ConnectOptions): Promise<Connection> {
  // Un query que espera para siempre a una base caida deja al pedido colgado y
  // al cliente sin respuesta: mejor fallar rapido y que el error suba tipado.
  mongoose.set('bufferCommands', false);
  // Prohibido escribir campos que el schema no declara.
  mongoose.set('strictQuery', true);

  const connection = mongoose.createConnection(uri, {
    dbName,
    serverSelectionTimeoutMS: 5_000,
    // La API es un solo proceso; un pool chico alcanza y no ahoga a Atlas.
    maxPoolSize: 10,
    minPoolSize: 1,
  });

  connection.on('error', (err) => {
    logger.error({ module: 'db', action: 'connection', err }, 'error de conexion a mongo');
  });
  connection.on('disconnected', () => {
    logger.warn({ module: 'db', action: 'connection' }, 'mongo desconectado');
  });

  await connection.asPromise();
  logger.info({ module: 'db', action: 'connect', meta: { dbName } }, 'mongo conectado');
  return connection;
}

/**
 * Ping real contra la base. Es lo que responde `/ready`.
 *
 * Un `readyState === 1` no alcanza: dice que el driver **cree** estar conectado,
 * no que la base conteste.
 */
export function createReadinessCheck(connection: Connection): () => Promise<boolean> {
  return async () => {
    const admin = connection.db?.admin();
    if (!admin) return false;
    const result = await admin.ping();
    return result['ok'] === 1;
  };
}

/**
 * ¿El deployment soporta transacciones? Solo un replica set o un cluster
 * sharded las tiene. Se verifica al arrancar en vez de descubrirlo cuando falla
 * el primer cobro.
 */
export async function supportsTransactions(connection: Connection): Promise<boolean> {
  const admin = connection.db?.admin();
  if (!admin) return false;
  try {
    const info = await admin.command({ hello: 1 });
    return Boolean(info['setName']) || info['msg'] === 'isdbgrid';
  } catch {
    return false;
  }
}
