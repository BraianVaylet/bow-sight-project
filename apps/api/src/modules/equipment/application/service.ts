import type {
  ArrowSetCreate,
  ArrowSetUpdate,
  BowSetupCreate,
  BowSetupUpdate,
} from '@bow-sight/schemas';
import { appError } from '../../../http/errors.js';
import type { OwnedRepository } from '../../../persistence/repository.js';
import { EQUIPMENT_ERRORS } from '../domain/errors.js';
import type { ArrowSetDoc, BowSetupDoc } from '../infrastructure/models.js';

/**
 * Puerto hacia `marks`: cuantas marcas usan este set de flechas.
 *
 * 🔴 Se declara aca, en el modulo que lo necesita, y lo contesta el punto de
 * composicion. `equipment` no sabe que existe `marks`: sabe que hay alguien que
 * le dice si un set esta en uso (ADR-002).
 */
export interface MarkUsage {
  countByArrowSet: (userId: string, arrowSetId: string) => Promise<number>;
}

export interface EquipmentServiceDeps {
  bowSetups: OwnedRepository<BowSetupDoc>;
  arrowSets: OwnedRepository<ArrowSetDoc>;
  marks: MarkUsage;
  now: () => Date;
}

export function createEquipmentService(deps: EquipmentServiceDeps) {
  const { bowSetups, arrowSets, marks, now } = deps;

  async function requireArrowSet(userId: string, id: string): Promise<ArrowSetDoc> {
    const found = await arrowSets.findOwned(userId, id);
    // 🔴 404, no 403: un 403 confirmaria que ese set existe.
    if (!found) throw appError(EQUIPMENT_ERRORS.notFound);
    return found;
  }

  return {
    listBowSetups: (userId: string) => bowSetups.list(userId),
    listArrowSets: (userId: string) => arrowSets.list(userId),

    async getBowSetup(userId: string, id: string): Promise<BowSetupDoc> {
      const found = await bowSetups.findOwned(userId, id);
      if (!found) throw appError(EQUIPMENT_ERRORS.notFound);
      return found;
    },

    getArrowSet: requireArrowSet,

    createBowSetup: (userId: string, data: BowSetupCreate) => bowSetups.create(userId, data),
    createArrowSet: (userId: string, data: ArrowSetCreate) => arrowSets.create(userId, data),

    async updateBowSetup(userId: string, id: string, patch: BowSetupUpdate): Promise<BowSetupDoc> {
      const updated = await bowSetups.update(userId, id, patch);
      if (!updated) throw appError(EQUIPMENT_ERRORS.notFound);
      return updated;
    },

    async updateArrowSet(userId: string, id: string, patch: ArrowSetUpdate): Promise<ArrowSetDoc> {
      const updated = await arrowSets.update(userId, id, patch);
      if (!updated) throw appError(EQUIPMENT_ERRORS.notFound);
      return updated;
    },

    async deleteBowSetup(userId: string, id: string): Promise<void> {
      const ok = await bowSetups.softDelete(userId, id, now());
      if (!ok) throw appError(EQUIPMENT_ERRORS.notFound);
      // Las miras que lo usaban quedan sin arco asociado, no se borran.
    },

    /**
     * 🔴 Borrar un set de flechas **con marcas cargadas se bloquea**.
     *
     * Son meses de campo y de flechas gastadas. Un borrado en cascada silencioso
     * seria la peor forma de perderlos: el arquero no se entera hasta que abre
     * la mira antes de un torneo.
     */
    async deleteArrowSet(userId: string, id: string): Promise<void> {
      await requireArrowSet(userId, id);

      const enUso = await marks.countByArrowSet(userId, id);
      if (enUso > 0) {
        throw appError(EQUIPMENT_ERRORS.arrowSetInUse, { count: enUso });
      }

      await arrowSets.softDelete(userId, id, now());
    },
  };
}

export type EquipmentService = ReturnType<typeof createEquipmentService>;
