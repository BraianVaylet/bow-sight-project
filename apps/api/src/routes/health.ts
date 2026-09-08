import { Hono } from 'hono';
import type { AppDeps, AppEnv } from '../types.js';

/**
 * `/health` y `/ready`, y la diferencia entre los dos importa.
 *
 * 🔴 El healthcheck de la plataforma apunta a **`/ready`**: `/health` responde
 * 200 mientras el proceso viva, aunque Mongo este caido. Un servicio que
 * responde pero no puede leer nada no esta listo para recibir trafico.
 *
 * Van **fuera** de `/api/v1`: no son parte del contrato del producto y no
 * versionan con el.
 */
export function createHealthRoutes(deps: Pick<AppDeps, 'isDatabaseReady' | 'now'>) {
  return new Hono<AppEnv>()
    .get('/health', (c) => c.json({ status: 'ok', ts: deps.now() }))
    .get('/ready', async (c) => {
      const database = await deps.isDatabaseReady().catch(() => false);
      return c.json(
        { status: database ? 'ready' : 'degraded', checks: { database }, ts: deps.now() },
        database ? 200 : 503,
      );
    });
}
