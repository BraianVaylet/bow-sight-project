import { sightCreateSchema, sightUpdateSchema } from '@bow-sight/schemas';
import { Hono } from 'hono';
import { parseBody, parseId } from '../../../http/validate.js';
import type { AppEnv } from '../../../types.js';
import type { SightService } from '../application/service.js';

export function createSightRoutes(service: SightService) {
  const app = new Hono<AppEnv>();
  const userOf = (c: { get: (k: 'userId') => string | undefined }) => c.get('userId')!;

  app.get('/', async (c) => c.json(await service.list(userOf(c))));

  app.post('/', async (c) => {
    const data = await parseBody(c, sightCreateSchema);
    return c.json(await service.create(userOf(c), data), 201);
  });

  app.get('/:id', async (c) => c.json(await service.get(userOf(c), parseId(c, 'id'))));

  app.patch('/:id', async (c) => {
    const patch = await parseBody(c, sightUpdateSchema);
    return c.json(await service.update(userOf(c), parseId(c, 'id'), patch));
  });

  app.delete('/:id', async (c) => {
    await service.remove(userOf(c), parseId(c, 'id'));
    return c.body(null, 204);
  });

  return app;
}
