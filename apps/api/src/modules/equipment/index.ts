import type { Connection } from 'mongoose';
import { ownedRepository } from '../../persistence/repository.js';
import { createEquipmentService, type MarkUsage } from './application/service.js';
import { equipmentModels, type ArrowSetDoc, type BowSetupDoc } from './infrastructure/models.js';
import { createEquipmentRoutes } from './infrastructure/routes.js';

export interface EquipmentModuleDeps {
  connection: Connection;
  /** Puerto: quien sabe si un set de flechas esta en uso. */
  marks: MarkUsage;
  now: () => Date;
}

/**
 * Interfaz publica del modulo.
 *
 * 🔴 Es lo unico que puede tocar otro modulo: el repositorio y el modelo se
 * quedan adentro. Lo bloquea ESLint (ADR-002).
 */
export interface EquipmentModule {
  routes: ReturnType<typeof createEquipmentRoutes>;
  /** Puerto hacia afuera: ¿este set de flechas es de este arquero? */
  ownsArrowSet: (userId: string, arrowSetId: string) => Promise<boolean>;
  ownsBowSetup: (userId: string, bowSetupId: string) => Promise<boolean>;
  /** Siembra un recurso del arquero victima, para la suite de aislamiento. */
  seedVictim: (victimUserId: string) => Promise<string>;
}

export function createEquipmentModule(deps: EquipmentModuleDeps): EquipmentModule {
  const models = equipmentModels(deps.connection);
  const bowSetups = ownedRepository<BowSetupDoc>(models.bowSetup);
  const arrowSets = ownedRepository<ArrowSetDoc>(models.arrowSet);

  const service = createEquipmentService({
    bowSetups,
    arrowSets,
    marks: deps.marks,
    now: deps.now,
  });

  return {
    routes: createEquipmentRoutes(service),
    ownsArrowSet: (userId, id) => arrowSets.exists(userId, id),
    ownsBowSetup: (userId, id) => bowSetups.exists(userId, id),
    seedVictim: async (victimUserId) => {
      const id = crypto.randomUUID();
      await arrowSets.create(victimUserId, { id, name: 'Set de la victima' });
      return id;
    },
  };
}
