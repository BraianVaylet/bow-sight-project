import { Hono } from 'hono';
import type { Connection } from 'mongoose';
import type { AppEnv } from '../types.js';
import { createEquipmentModule, type EquipmentModule } from './equipment/index.js';
import { createMarkModule, type MarkModule } from './marks/index.js';
import { createSightModule, type SightModule } from './sights/index.js';

export interface Modules {
  equipment: EquipmentModule;
  sights: SightModule;
  marks: MarkModule;
  routes: Hono<AppEnv>;
}

/**
 * Punto de composicion.
 *
 * 🔴 Los modulos **no se importan entre si**: cada uno declara los puertos que
 * necesita y aca se le pasa quien los contesta (ADR-002). `equipment` no sabe
 * que existe `marks`; sabe que hay alguien que le dice si un set esta en uso.
 *
 * Los ciclos —`equipment` necesita a `marks` y `marks` necesita a `equipment`—
 * se resuelven con **resolucion tardia**: los puertos son funciones que miran la
 * referencia recien cuando alguien las llama, no cuando se construyen.
 */
export function createModules(deps: { connection: Connection; now: () => Date }): Modules {
  // Un contenedor en vez de tres `let`: las referencias se leen recien cuando
  // alguien llama al puerto, que es lo que rompe el ciclo.
  const wired: {
    equipment?: EquipmentModule;
    sights?: SightModule;
    marks?: MarkModule;
  } = {};

  const equipment = createEquipmentModule({
    connection: deps.connection,
    marks: {
      countByArrowSet: (userId, arrowSetId) => wired.marks!.countByArrowSet(userId, arrowSetId),
    },
    now: deps.now,
  });

  wired.equipment = equipment;

  const sights = createSightModule({
    connection: deps.connection,
    equipment: {
      ownsBowSetup: (userId, id) => wired.equipment!.ownsBowSetup(userId, id),
      ownsArrowSet: (userId, id) => wired.equipment!.ownsArrowSet(userId, id),
    },
    marks: {
      countOutsideRange: (userId, sightId, range) =>
        wired.marks!.countOutsideRange(userId, sightId, range),
      softDeleteBySight: (userId, sightId, now) =>
        wired.marks!.softDeleteBySight(userId, sightId, now),
    },
    now: deps.now,
  });

  wired.sights = sights;

  const marks = createMarkModule({
    connection: deps.connection,
    sights: { findOwned: (userId, id) => wired.sights!.findOwned(userId, id) },
    equipment: { ownsArrowSet: (userId, id) => wired.equipment!.ownsArrowSet(userId, id) },
    now: deps.now,
  });

  wired.marks = marks;

  const routes = new Hono<AppEnv>();
  routes.route('/equipment', equipment.routes);
  routes.route('/sights', sights.routes);
  // Las marcas cuelgan de su mira; el router declara `/:sightId/marks`.
  routes.route('/sights', marks.routes);

  return { equipment, sights, marks, routes };
}
