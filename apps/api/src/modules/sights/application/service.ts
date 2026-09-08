import type { SightCreate, SightUpdate } from '@bow-sight/schemas';
import { appError } from '../../../http/errors.js';
import type { OwnedRepository } from '../../../persistence/repository.js';
import { SIGHT_ERRORS } from '../domain/errors.js';
import type { SightDoc } from '../infrastructure/models.js';

/** Puerto hacia `equipment`: ¿este arco / set es de este arquero? */
export interface EquipmentOwnership {
  ownsBowSetup: (userId: string, id: string) => Promise<boolean>;
  ownsArrowSet: (userId: string, id: string) => Promise<boolean>;
}

/** Puerto hacia `marks`: consultar el rango y borrar en cascada. */
export interface MarkRangeCheck {
  countOutsideRange: (
    userId: string,
    sightId: string,
    range: { minMm: number; maxMm: number },
  ) => Promise<number>;
  /** Borrado en cascada, **soft**: nada se pierde. */
  softDeleteBySight: (userId: string, sightId: string, now: Date) => Promise<number>;
}

export interface SightServiceDeps {
  sights: OwnedRepository<SightDoc>;
  equipment: EquipmentOwnership;
  marks: MarkRangeCheck;
  now: () => Date;
}

export function createSightService({ sights, equipment, marks, now }: SightServiceDeps) {
  /**
   * Valida que el arco y el set referenciados sean **del mismo arquero**.
   *
   * Sin esto, alguien podria asociar su mira al arco de otro y, de paso,
   * enterarse de que ese id existe.
   */
  async function assertRefsOwned(
    userId: string,
    // Solo lo que se lee: con `exactOptionalPropertyTypes`, un `Partial<>` del
    // schema de creacion no acepta el del de edicion.
    data: { bowSetupId?: string | null | undefined; defaultArrowSetId?: string | null | undefined },
  ): Promise<void> {
    if (data.bowSetupId && !(await equipment.ownsBowSetup(userId, data.bowSetupId))) {
      throw appError(SIGHT_ERRORS.notFound, { field: 'bowSetupId' });
    }
    if (data.defaultArrowSetId && !(await equipment.ownsArrowSet(userId, data.defaultArrowSetId))) {
      throw appError(SIGHT_ERRORS.notFound, { field: 'defaultArrowSetId' });
    }
  }

  async function require(userId: string, id: string): Promise<SightDoc> {
    const found = await sights.findOwned(userId, id);
    if (!found) throw appError(SIGHT_ERRORS.notFound);
    return found;
  }

  return {
    list: (userId: string) => sights.list(userId),
    get: require,

    async create(userId: string, data: SightCreate): Promise<SightDoc> {
      await assertRefsOwned(userId, data);
      return sights.create(userId, data as unknown as Record<string, unknown> & { id: string });
    },

    async update(userId: string, id: string, patch: SightUpdate): Promise<SightDoc> {
      const actual = await require(userId, id);

      // 🔴 Una mira bloqueada por el plan se lee y se imprime, no se edita.
      if (actual.status === 'locked') throw appError(SIGHT_ERRORS.locked);

      await assertRefsOwned(userId, patch);

      const minMm = patch.scaleMinMm ?? actual.scaleMinMm;
      const maxMm = patch.scaleMaxMm ?? actual.scaleMaxMm;
      if (minMm >= maxMm) throw appError(SIGHT_ERRORS.badScaleRange);

      // Achicar el rango no puede dejar marcas huerfanas en silencio: el
      // arquero tiene que enterarse de cuantas quedarian afuera y decidir.
      if (minMm > actual.scaleMinMm || maxMm < actual.scaleMaxMm) {
        const afuera = await marks.countOutsideRange(userId, id, { minMm, maxMm });
        if (afuera > 0) {
          throw appError(SIGHT_ERRORS.marksOutsideNewRange, { count: afuera });
        }
      }

      const updated = await sights.update(userId, id, patch as Record<string, unknown>);
      if (!updated) throw appError(SIGHT_ERRORS.notFound);
      return updated;
    },

    async remove(userId: string, id: string): Promise<void> {
      const actual = await require(userId, id);
      if (actual.status === 'locked') throw appError(SIGHT_ERRORS.locked);

      const momento = now();
      // Cascada **soft**: las marcas quedan en la base. Son meses de campo, y el
      // dia que alguien pida recuperar una mira borrada por error, van a estar.
      await marks.softDeleteBySight(userId, id, momento);
      await sights.softDelete(userId, id, momento);
    },
  };
}

export type SightService = ReturnType<typeof createSightService>;
