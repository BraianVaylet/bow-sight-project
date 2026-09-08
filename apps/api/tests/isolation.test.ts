import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cookiesOf, startAuthHarness, type AuthHarness } from './authHarness.js';

/**
 * Suite parametrizada de aislamiento (ADR-000, tercera capa).
 *
 * 🔴 Recorre **todas** las rutas de negocio y ataca cada una desde otro arquero.
 * Y la parte que la hace util a futuro: compara la lista de ataques contra las
 * rutas que la app tiene montadas. **Una ruta nueva sin su fixture rompe este
 * test**, asi que no hay forma de agregar un endpoint y olvidarse del ataque.
 */

let h: AuthHarness;
let victima: string;
let atacante: string;
let recurso: { sightId: string; arrowSetId: string; bowSetupId: string; markId: string };

const uuid = () => crypto.randomUUID();

function como(cookie: string, method: string, path: string, body?: unknown) {
  return h.app.request(path, {
    method,
    headers: { 'content-type': 'application/json', cookie },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

async function alta(email: string): Promise<string> {
  const res = await h.app.request('/api/v1/auth/sign-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'marca-de-mira-30m', name: 'A' }),
  });
  return cookiesOf(res);
}

beforeAll(async () => {
  h = await startAuthHarness();
  await h.reset();

  victima = await alta('victima@example.com');
  atacante = await alta('atacante@example.com');

  const bowSetupId = uuid();
  const arrowSetId = uuid();
  const sightId = uuid();
  const markId = uuid();

  await como(victima, 'POST', '/api/v1/equipment/bow-setups', { id: bowSetupId, name: 'Evo NXT' });
  await como(victima, 'POST', '/api/v1/equipment/arrow-sets', { id: arrowSetId, name: 'VAP' });
  await como(victima, 'POST', '/api/v1/sights', {
    id: sightId,
    name: 'Ultraview',
    scaleMinMm: 0,
    scaleMaxMm: 600,
  });
  await como(victima, 'POST', `/api/v1/sights/${sightId}/marks`, {
    id: markId,
    arrowSetId,
    distanceM: 30,
    scaleValueMm: 120,
  });

  recurso = { sightId, arrowSetId, bowSetupId, markId };
}, 180_000);

afterAll(async () => {
  await h?.stop();
});

interface Ataque {
  method: string;
  /** Ruta con los ids del arquero **victima** ya resueltos. */
  path: () => string;
  body?: () => unknown;
  /** Plantilla de la ruta, para cruzar contra las montadas. */
  template: string;
}

/** Un ataque por ruta de negocio. Agregar una ruta obliga a agregar el suyo. */
const ATAQUES: Ataque[] = [
  {
    method: 'GET',
    template: '/api/v1/equipment/bow-setups',
    path: () => '/api/v1/equipment/bow-setups',
  },
  {
    method: 'POST',
    template: '/api/v1/equipment/bow-setups',
    path: () => '/api/v1/equipment/bow-setups',
    body: () => ({ id: uuid(), name: 'x' }),
  },
  {
    method: 'GET',
    template: '/api/v1/equipment/bow-setups/:id',
    path: () => `/api/v1/equipment/bow-setups/${recurso.bowSetupId}`,
  },
  {
    method: 'PATCH',
    template: '/api/v1/equipment/bow-setups/:id',
    path: () => `/api/v1/equipment/bow-setups/${recurso.bowSetupId}`,
    body: () => ({ name: 'robado' }),
  },
  {
    method: 'DELETE',
    template: '/api/v1/equipment/bow-setups/:id',
    path: () => `/api/v1/equipment/bow-setups/${recurso.bowSetupId}`,
  },
  {
    method: 'GET',
    template: '/api/v1/equipment/arrow-sets',
    path: () => '/api/v1/equipment/arrow-sets',
  },
  {
    method: 'POST',
    template: '/api/v1/equipment/arrow-sets',
    path: () => '/api/v1/equipment/arrow-sets',
    body: () => ({ id: uuid(), name: 'x' }),
  },
  {
    method: 'GET',
    template: '/api/v1/equipment/arrow-sets/:id',
    path: () => `/api/v1/equipment/arrow-sets/${recurso.arrowSetId}`,
  },
  {
    method: 'PATCH',
    template: '/api/v1/equipment/arrow-sets/:id',
    path: () => `/api/v1/equipment/arrow-sets/${recurso.arrowSetId}`,
    body: () => ({ name: 'robado' }),
  },
  {
    method: 'DELETE',
    template: '/api/v1/equipment/arrow-sets/:id',
    path: () => `/api/v1/equipment/arrow-sets/${recurso.arrowSetId}`,
  },
];

ATAQUES.push(
  { method: 'GET', template: '/api/v1/sights', path: () => '/api/v1/sights' },
  {
    method: 'POST',
    template: '/api/v1/sights',
    path: () => '/api/v1/sights',
    body: () => ({ id: uuid(), name: 'x', scaleMinMm: 0, scaleMaxMm: 600 }),
  },
  {
    method: 'GET',
    template: '/api/v1/sights/:id',
    path: () => `/api/v1/sights/${recurso.sightId}`,
  },
  {
    method: 'PATCH',
    template: '/api/v1/sights/:id',
    path: () => `/api/v1/sights/${recurso.sightId}`,
    body: () => ({ name: 'robada' }),
  },
  {
    method: 'DELETE',
    template: '/api/v1/sights/:id',
    path: () => `/api/v1/sights/${recurso.sightId}`,
  },
  {
    method: 'GET',
    template: '/api/v1/sights/:sightId/marks',
    path: () => `/api/v1/sights/${recurso.sightId}/marks`,
  },
  {
    method: 'POST',
    template: '/api/v1/sights/:sightId/marks',
    path: () => `/api/v1/sights/${recurso.sightId}/marks`,
    body: () => ({ id: uuid(), arrowSetId: recurso.arrowSetId, distanceM: 40, scaleValueMm: 200 }),
  },
  {
    method: 'PATCH',
    template: '/api/v1/sights/:sightId/marks/:id',
    path: () => `/api/v1/sights/${recurso.sightId}/marks/${recurso.markId}`,
    body: () => ({ scaleValueMm: 999 }),
  },
  {
    method: 'DELETE',
    template: '/api/v1/sights/:sightId/marks/:id',
    path: () => `/api/v1/sights/${recurso.sightId}/marks/${recurso.markId}`,
  },
  {
    method: 'GET',
    template: '/api/v1/sights/:sightId/marks/calculate',
    path: () =>
      `/api/v1/sights/${recurso.sightId}/marks/calculate?arrowSetId=${recurso.arrowSetId}&distanceM=35`,
  },
);

/** Rutas que no operan sobre datos de un arquero y no necesitan ataque. */
const SIN_DUENO = [
  /^\/health$/,
  /^\/ready$/,
  /^\/api\/v1\/auth\//,
  // El contrato de la API: publico a proposito y no toca datos de nadie.
  /^\/api\/v1\/docs$/,
  /^\/\*$/,
  /^\/$/,
];

describe('aislamiento por usuario', () => {
  it.each(ATAQUES.map((a, i) => [i, `${a.method} ${a.template}`, a] as const))(
    'ataque %i — %s no entrega lo ajeno',
    async (_i, etiqueta, ataque) => {
      const res = await como(atacante, ataque.method, ataque.path(), ataque.body?.());

      if (res.status === 200) {
        // Los listados responden 200 pero **vacios**: traen lo del atacante.
        const body = (await res.json()) as unknown;
        expect(Array.isArray(body), `${etiqueta} devolvio un objeto`).toBe(true);
        const ids = (body as Array<{ _id?: string }>).map((x) => x._id);
        expect(ids).not.toContain(recurso.sightId);
        expect(ids).not.toContain(recurso.arrowSetId);
        expect(ids).not.toContain(recurso.bowSetupId);
        expect(ids).not.toContain(recurso.markId);
      } else {
        // 🔴 404, nunca 403: un 403 confirmaria que ese recurso existe.
        expect(res.status, etiqueta).not.toBe(403);
        expect([201, 400, 404, 422], etiqueta).toContain(res.status);
      }
    },
  );

  it('🔴 los datos de la victima siguen intactos despues de todos los ataques', async () => {
    const mira = await como(victima, 'GET', `/api/v1/sights/${recurso.sightId}`);
    expect(mira.status).toBe(200);
    await expect(mira.json()).resolves.toMatchObject({ name: 'Ultraview' });

    const marcas = (await (
      await como(victima, 'GET', `/api/v1/sights/${recurso.sightId}/marks`)
    ).json()) as Array<{ scaleValueMm: number }>;
    expect(marcas).toHaveLength(1);
    expect(marcas[0]?.scaleValueMm).toBe(120);
  });

  it('🔴 toda ruta de negocio montada tiene su fixture de ataque', () => {
    // Es lo que impide agregar un endpoint y olvidarse del test: sin fixture,
    // este test falla y el CI con el.
    const montadas = h.app.routes
      .filter((r) => r.method !== 'ALL')
      .map((r) => `${r.method} ${r.path}`)
      .filter((r) => !SIN_DUENO.some((re) => re.test(r.split(' ')[1] ?? '')));

    // Que no sea vacuo: si la lista de rutas viniera vacia, el test pasaria
    // siempre sin comparar nada, que es peor que no tenerlo.
    expect(montadas.length).toBeGreaterThanOrEqual(ATAQUES.length);

    const conAtaque = new Set(ATAQUES.map((a) => `${a.method} ${a.template}`));
    const sinAtaque = [...new Set(montadas)].filter((r) => !conAtaque.has(r));

    expect(sinAtaque, `rutas sin fixture de ataque: ${sinAtaque.join(' · ')}`).toEqual([]);
  });
});
