import {
  arrowSetCreateSchema,
  arrowSetUpdateSchema,
  bowSetupCreateSchema,
  bowSetupUpdateSchema,
} from '@bow-sight/schemas';
import { Hono } from 'hono';
import { parseBody, parseId } from '../../../http/validate.js';
import type { AppEnv } from '../../../types.js';
import type { EquipmentService } from '../application/service.js';

/**
 * 🔴 Ninguna ruta acepta un `userId`: sale de `requireAuth`, siempre.
 * Si el cliente pudiera elegirlo, el aislamiento seria una sugerencia (ADR-000).
 */
export function createEquipmentRoutes(service: EquipmentService) {
  const app = new Hono<AppEnv>();
  const userOf = (c: { get: (k: 'userId') => string | undefined }) => c.get('userId')!;

  // ── Setups de arco ────────────────────────────────────────────────
  app.get('/bow-setups', async (c) => c.json(await service.listBowSetups(userOf(c))));

  app.post('/bow-setups', async (c) => {
    const data = await parseBody(c, bowSetupCreateSchema);
    return c.json(await service.createBowSetup(userOf(c), data), 201);
  });

  app.get('/bow-setups/:id', async (c) =>
    c.json(await service.getBowSetup(userOf(c), parseId(c, 'id'))),
  );

  app.patch('/bow-setups/:id', async (c) => {
    const patch = await parseBody(c, bowSetupUpdateSchema);
    return c.json(await service.updateBowSetup(userOf(c), parseId(c, 'id'), patch));
  });

  app.delete('/bow-setups/:id', async (c) => {
    await service.deleteBowSetup(userOf(c), parseId(c, 'id'));
    return c.body(null, 204);
  });

  // ── Sets de flechas ───────────────────────────────────────────────
  app.get('/arrow-sets', async (c) => c.json(await service.listArrowSets(userOf(c))));

  app.post('/arrow-sets', async (c) => {
    const data = await parseBody(c, arrowSetCreateSchema);
    return c.json(await service.createArrowSet(userOf(c), data), 201);
  });

  app.get('/arrow-sets/:id', async (c) =>
    c.json(await service.getArrowSet(userOf(c), parseId(c, 'id'))),
  );

  app.patch('/arrow-sets/:id', async (c) => {
    const patch = await parseBody(c, arrowSetUpdateSchema);
    return c.json(await service.updateArrowSet(userOf(c), parseId(c, 'id'), patch));
  });

  app.delete('/arrow-sets/:id', async (c) => {
    await service.deleteArrowSet(userOf(c), parseId(c, 'id'));
    return c.body(null, 204);
  });

  return app;
}
