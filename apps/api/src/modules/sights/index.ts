import type { Connection } from 'mongoose';
import { ownedRepository } from '../../persistence/repository.js';
import {
  createSightService,
  type EquipmentOwnership,
  type MarkRangeCheck,
} from './application/service.js';
import { sightModel, type SightDoc } from './infrastructure/models.js';
import { createSightRoutes } from './infrastructure/routes.js';

export interface SightModuleDeps {
  connection: Connection;
  equipment: EquipmentOwnership;
  marks: MarkRangeCheck;
  now: () => Date;
}

export interface SightModule {
  routes: ReturnType<typeof createSightRoutes>;
  /** Puerto hacia afuera: `marks` necesita el rango de la mira para validar. */
  findOwned: (userId: string, id: string) => Promise<SightDoc | null>;
  seedVictim: (victimUserId: string) => Promise<string>;
}

export function createSightModule(deps: SightModuleDeps): SightModule {
  const sights = ownedRepository<SightDoc>(sightModel(deps.connection));
  const service = createSightService({
    sights,
    equipment: deps.equipment,
    marks: deps.marks,
    now: deps.now,
  });

  return {
    routes: createSightRoutes(service),
    findOwned: (userId, id) => sights.findOwned(userId, id),
    seedVictim: async (victimUserId) => {
      const id = crypto.randomUUID();
      await sights.create(victimUserId, {
        id,
        name: 'Mira de la victima',
        scaleMinMm: 0,
        scaleMaxMm: 600,
        scaleUnit: 'cm',
      });
      return id;
    },
  };
}

export type { SightDoc } from './infrastructure/models.js';
