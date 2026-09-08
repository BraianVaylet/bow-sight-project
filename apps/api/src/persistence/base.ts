import { Schema, type Connection, type Model } from 'mongoose';
import { ownershipGuard } from './ownership.js';

/** Campos que lleva todo documento de negocio. */
export interface OwnedDoc {
  _id: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  /** Soft delete: `null` mientras esta vivo. */
  deletedAt: Date | null;
}

/**
 * Schema base de una coleccion del arquero.
 *
 * El `_id` es un **string**, no un ObjectId: los ids los genera el cliente con
 * UUIDv7 (ADR-006), y convertirlos de ida y vuelta solo agrega una forma de
 * equivocarse.
 */
export function ownedSchema(collection: string, fields: Record<string, unknown>): Schema {
  const schema = new Schema(
    {
      _id: { type: String, required: true },
      userId: { type: String, required: true, index: true },
      deletedAt: { type: Date, default: null },
      ...fields,
    },
    {
      timestamps: true,
      /**
       * 🔴 El nombre de la coleccion se fija a mano.
       *
       * Mongoose pluraliza por defecto —`mark` seria `marks`— y las migraciones
       * crean los indices con el nombre **singular** de la spec §5.4.2. Sin
       * esto, los unicos (incluido el de idempotencia de los webhooks) quedan
       * sobre colecciones que nadie usa, y no se nota hasta que llega el primer
       * duplicado en produccion.
       */
      collection,
      // Prohibido escribir campos que el schema no declara.
      strict: 'throw',
      versionKey: false,
      _id: false,
    },
  );

  schema.plugin(ownershipGuard);
  return schema;
}

/** Solo lo vivo. Todo listado del arquero arranca de aca. */
export const VIVOS = { deletedAt: null } as const;

export type OwnedModel<T> = Model<T & OwnedDoc>;

export function modelOn<T>(connection: Connection, name: string, schema: Schema): OwnedModel<T> {
  // `connection.models` evita el error de recompilar el modelo si el harness de
  // tests crea la conexion mas de una vez.
  return (connection.models[name] ?? connection.model(name, schema)) as OwnedModel<T>;
}
