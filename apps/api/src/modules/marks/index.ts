import type { Connection } from 'mongoose';
import { VIVOS } from '../../persistence/base.js';
import { ownedRepository } from '../../persistence/repository.js';
import { createMarkService, type ArrowSetLookup, type SightLookup } from './application/service.js';
import { markModel, type MarkDoc } from './infrastructure/models.js';
import { createMarkRoutes } from './infrastructure/routes.js';

export interface MarkModuleDeps {
  connection: Connection;
  sights: SightLookup;
  equipment: ArrowSetLookup;
  now: () => Date;
}

export interface MarkModule {
  routes: ReturnType<typeof createMarkRoutes>;
  /** Puerto hacia `equipment`: ¿este set esta en uso? */
  countByArrowSet: (userId: string, arrowSetId: string) => Promise<number>;
  /** Puerto hacia `sights`: ¿cuantas quedarian fuera del rango nuevo? */
  countOutsideRange: (
    userId: string,
    sightId: string,
    range: { minMm: number; maxMm: number },
  ) => Promise<number>;
  /** Borrado en cascada al borrar una mira. Soft: nada se pierde. */
  softDeleteBySight: (userId: string, sightId: string, now: Date) => Promise<number>;
  seedVictim: (victimUserId: string, sightId: string, arrowSetId: string) => Promise<string>;
}

export function createMarkModule(deps: MarkModuleDeps): MarkModule {
  const marks = ownedRepository<MarkDoc>(markModel(deps.connection));
  const service = createMarkService({
    marks,
    sights: deps.sights,
    equipment: deps.equipment,
    now: deps.now,
  });

  return {
    routes: createMarkRoutes(service),

    countByArrowSet: (userId, arrowSetId) =>
      marks.model.countDocuments({ userId, arrowSetId, ...VIVOS }).exec(),

    countOutsideRange: (userId, sightId, range) =>
      marks.model
        .countDocuments({
          userId,
          sightId,
          ...VIVOS,
          $or: [{ scaleValueMm: { $lt: range.minMm } }, { scaleValueMm: { $gt: range.maxMm } }],
        })
        .exec(),

    softDeleteBySight: async (userId, sightId, now) => {
      const result = await marks.model
        .updateMany({ userId, sightId, ...VIVOS }, { $set: { deletedAt: now } })
        .exec();
      return result.modifiedCount;
    },

    seedVictim: async (victimUserId, sightId, arrowSetId) => {
      const id = crypto.randomUUID();
      await marks.create(victimUserId, {
        id,
        sightId,
        arrowSetId,
        distanceM: 30,
        scaleValueMm: 120,
        origin: 'measured',
      });
      return id;
    },
  };
}
