import type { OwnedDoc, OwnedModel } from './base.js';
import { VIVOS } from './base.js';

/**
 * Repositorio de una coleccion del arquero.
 *
 * 🔴 **Primera capa de aislamiento** (ADR-000): el `userId` se inyecta aca, en
 * cada consulta, sin excepcion. Un controller no toca el modelo de Mongoose: lo
 * bloquea ESLint, y si algo se filtra igual, la segunda capa —el plugin— lo
 * detiene.
 *
 * 🔴 **"No es tuyo" devuelve `null`**, que la ruta traduce a 404 y no a 403. Un
 * 403 confirmaria que ese recurso existe, que es justo lo que el atacante quiere
 * saber.
 */
export function ownedRepository<T extends OwnedDoc>(model: OwnedModel<Omit<T, keyof OwnedDoc>>) {
  type Doc = T;

  return {
    async list(userId: string): Promise<Doc[]> {
      const docs = await model
        .find({ userId, ...VIVOS })
        .sort({ updatedAt: -1 })
        .lean()
        .exec();
      return docs as unknown as Doc[];
    },

    async findOwned(userId: string, id: string): Promise<Doc | null> {
      const doc = await model
        .findOne({ _id: id, userId, ...VIVOS })
        .lean()
        .exec();
      return (doc as unknown as Doc) ?? null;
    },

    async exists(userId: string, id: string): Promise<boolean> {
      const count = await model.countDocuments({ _id: id, userId, ...VIVOS }).exec();
      return count > 0;
    },

    async create(userId: string, data: Record<string, unknown> & { id: string }): Promise<Doc> {
      const { id, ...rest } = data;
      // El id lo genera el cliente (ADR-006): se usa tal cual.
      const doc = await model.create({ _id: id, userId, ...rest });
      return doc.toObject() as unknown as Doc;
    },

    async update(userId: string, id: string, patch: Record<string, unknown>): Promise<Doc | null> {
      const doc = await model
        .findOneAndUpdate({ _id: id, userId, ...VIVOS }, { $set: patch }, { new: true })
        .lean()
        .exec();
      return (doc as unknown as Doc) ?? null;
    },

    /** Soft delete: nada se pierde, y el unico parcial libera el nombre. */
    async softDelete(userId: string, id: string, now: Date): Promise<boolean> {
      const result = await model
        .updateOne({ _id: id, userId, ...VIVOS }, { $set: { deletedAt: now } })
        .exec();
      return result.matchedCount > 0;
    },

    /** El modelo crudo, para las consultas que no encajan en el CRUD. */
    model,
  };
}

export type OwnedRepository<T extends OwnedDoc> = ReturnType<typeof ownedRepository<T>>;
