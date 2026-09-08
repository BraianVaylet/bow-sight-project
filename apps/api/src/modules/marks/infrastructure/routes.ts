import { markCreateSchema, markQuerySchema, markUpdateSchema } from '@bow-sight/schemas';
import { Hono } from 'hono';
import { parseBody, parseId, parseQuery } from '../../../http/validate.js';
import type { AppEnv } from '../../../types.js';
import type { MarkService } from '../application/service.js';

/** Las marcas cuelgan de su mira: `/sights/:sightId/marks`. */
export function createMarkRoutes(service: MarkService) {
  const app = new Hono<AppEnv>();
  const userOf = (c: { get: (k: 'userId') => string | undefined }) => c.get('userId')!;

  app.get('/:sightId/marks', async (c) => {
    const arrowSetId = c.req.query('arrowSetId');
    return c.json(await service.list(userOf(c), parseId(c, 'sightId'), arrowSetId ?? undefined));
  });

  app.post('/:sightId/marks', async (c) => {
    const data = await parseBody(c, markCreateSchema);
    return c.json(await service.create(userOf(c), parseId(c, 'sightId'), data), 201);
  });

  app.patch('/:sightId/marks/:id', async (c) => {
    const patch = await parseBody(c, markUpdateSchema);
    return c.json(await service.update(userOf(c), parseId(c, 'sightId'), parseId(c, 'id'), patch));
  });

  app.delete('/:sightId/marks/:id', async (c) => {
    await service.remove(userOf(c), parseId(c, 'sightId'), parseId(c, 'id'));
    return c.body(null, 204);
  });

  /** La calculadora: cualquier distancia, con angulo opcional. */
  app.get('/:sightId/marks/calculate', async (c) =>
    c.json(
      await service.calculate(userOf(c), parseId(c, 'sightId'), parseQuery(c, markQuerySchema)),
    ),
  );

  return app;
}
