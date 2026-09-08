import type { Schema } from 'mongoose';

/** Operaciones de lectura y escritura que llevan filtro. */
const CON_FILTRO = [
  'find',
  'findOne',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'countDocuments',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
] as const;

export class MissingOwnerFilterError extends Error {
  constructor(operation: string, collection: string) {
    super(
      `Consulta sin userId en ${collection}.${operation}. ` +
        'Toda consulta de datos del arquero pasa por su repositorio (ADR-000).',
    );
    this.name = 'MissingOwnerFilterError';
  }
}

/**
 * Segunda capa de aislamiento: la red de seguridad.
 *
 * 🔴 Si una consulta sobre datos del arquero llegara **sin `userId` en el
 * filtro**, falla en vez de devolver los datos de todos.
 *
 * La primera capa es el repositorio, que inyecta el `userId`; la tercera es la
 * suite parametrizada que ataca cada ruta desde otro usuario. Ninguna alcanza
 * sola: el repositorio depende de que nadie se distraiga, y la suite solo cubre
 * lo que pasa por una ruta. Esta cubre el resto — un script, un job, una consulta
 * escrita a las apuradas.
 *
 * `bypassOwnership()` existe para lo que legitimamente cruza usuarios: las
 * migraciones, los jobs de plataforma y el acceso de un coach ya autorizado. Es
 * explicito a proposito — se ve en el diff.
 */
export function ownershipGuard(schema: Schema): void {
  for (const operation of CON_FILTRO) {
    schema.pre(
      operation,
      function (this: {
        getFilter?: () => Record<string, unknown>;
        getOptions?: () => Record<string, unknown>;
        model?: { collection?: { name?: string } };
      }) {
        const options = this.getOptions?.() ?? {};
        if (options['bypassOwnership'] === true) return;

        const filter = this.getFilter?.() ?? {};
        const owner = filter['userId'];
        const tieneOwner =
          owner !== undefined && owner !== null && !(typeof owner === 'object' && owner === null);

        if (!tieneOwner) {
          throw new MissingOwnerFilterError(
            operation,
            this.model?.collection?.name ?? 'desconocida',
          );
        }
      },
    );
  }
}

/**
 * Marca una consulta como legitimamente sin dueño.
 *
 * Se usa en migraciones, jobs de plataforma y en la lectura de un coach que ya
 * paso por su chequeo de `share`. Escribirlo es declarar que se penso.
 */
export const bypassOwnership = { bypassOwnership: true } as const;
