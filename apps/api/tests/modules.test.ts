import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cookiesOf, startAuthHarness, type AuthHarness } from './authHarness.js';

let h: AuthHarness;
let cookie: string;

const uuid = () => crypto.randomUUID();

beforeAll(async () => {
  h = await startAuthHarness();
}, 180_000);

afterAll(async () => {
  await h?.stop();
});

/** Crea un arquero y devuelve su cookie de sesion. */
async function nuevoArquero(email: string): Promise<string> {
  const res = await h.app.request('/api/v1/auth/sign-up', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password: 'marca-de-mira-30m', name: 'Arquero' }),
  });
  return cookiesOf(res);
}

function api(path: string, init: RequestInit = {}, as = cookie) {
  return h.app.request(path, {
    ...init,
    headers: { 'content-type': 'application/json', cookie: as, ...(init.headers ?? {}) },
  });
}

const post = (path: string, body: unknown, as?: string) =>
  api(path, { method: 'POST', body: JSON.stringify(body) }, as);
const patch = (path: string, body: unknown, as?: string) =>
  api(path, { method: 'PATCH', body: JSON.stringify(body) }, as);
const del = (path: string, as?: string) => api(path, { method: 'DELETE' }, as);

/** Mira 0–60 cm (0–600 mm) con un set de flechas, lista para cargar marcas. */
async function armarMira(as = cookie) {
  const arrowSetId = uuid();
  await post('/api/v1/equipment/arrow-sets', { id: arrowSetId, name: 'VAP V1 400' }, as);

  const sightId = uuid();
  await post(
    '/api/v1/sights',
    { id: sightId, name: 'Ultraview / Evo', scaleMinMm: 0, scaleMaxMm: 600 },
    as,
  );
  return { sightId, arrowSetId };
}

beforeEach(async () => {
  await h.reset();
  cookie = await nuevoArquero('braian@example.com');
});

describe('equipo', () => {
  it('crea, lista, edita y borra un set de flechas', async () => {
    const id = uuid();
    const creado = await post('/api/v1/equipment/arrow-sets', {
      id,
      name: 'VAP V1 400',
      spine: 400,
      speedFps: 285,
    });
    expect(creado.status).toBe(201);

    const lista = await api('/api/v1/equipment/arrow-sets');
    await expect(lista.json()).resolves.toHaveLength(1);

    const editado = await patch(`/api/v1/equipment/arrow-sets/${id}`, { speedFps: 290 });
    await expect(editado.json()).resolves.toMatchObject({ speedFps: 290 });

    expect((await del(`/api/v1/equipment/arrow-sets/${id}`)).status).toBe(204);
    await expect((await api('/api/v1/equipment/arrow-sets')).json()).resolves.toHaveLength(0);
  });

  it('🔴 borrar un set con marcas cargadas se bloquea', async () => {
    // Son meses de campo y de flechas gastadas: no se pierden en silencio.
    const { sightId, arrowSetId } = await armarMira();
    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });

    const res = await del(`/api/v1/equipment/arrow-sets/${arrowSetId}`);
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'BS-EQUIP-409-002', params: { count: 1 } },
    });
  });

  it('un id que no existe responde 404', async () => {
    expect((await api(`/api/v1/equipment/arrow-sets/${uuid()}`)).status).toBe(404);
  });
});

describe('miras', () => {
  it('🔴 un rango invertido no se guarda', async () => {
    const res = await post('/api/v1/sights', {
      id: uuid(),
      name: 'Mala',
      scaleMinMm: 600,
      scaleMaxMm: 0,
    });
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: { messageKey: 'validation.sight.badScaleRange' },
    });
  });

  it('no acepta un arco de otro arquero', async () => {
    const otro = await nuevoArquero('otro@example.com');
    const bowId = uuid();
    await post('/api/v1/equipment/bow-setups', { id: bowId, name: 'Ajeno' }, otro);

    const res = await post('/api/v1/sights', {
      id: uuid(),
      name: 'Mia',
      scaleMinMm: 0,
      scaleMaxMm: 600,
      bowSetupId: bowId,
    });
    // 404 y no 403: no confirma que ese arco exista.
    expect(res.status).toBe(404);
  });

  it('🔴 achicar el rango dejando marcas afuera se bloquea y dice cuantas', async () => {
    const { sightId, arrowSetId } = await armarMira();
    for (const [d, mm] of [
      [20, 40],
      [50, 320],
    ] as const) {
      await post(`/api/v1/sights/${sightId}/marks`, {
        id: uuid(),
        arrowSetId,
        distanceM: d,
        scaleValueMm: mm,
      });
    }

    const res = await patch(`/api/v1/sights/${sightId}`, { scaleMaxMm: 100 });
    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'BS-SIGHT-409-003', params: { count: 1 } },
    });
  });

  it('borrar una mira arrastra sus marcas, en soft', async () => {
    const { sightId, arrowSetId } = await armarMira();
    const marca = await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });
    expect(marca.status, await marca.clone().text()).toBe(201);

    expect((await del(`/api/v1/sights/${sightId}`)).status).toBe(204);
    expect((await api(`/api/v1/sights/${sightId}/marks`)).status).toBe(404);

    // Nada se perdio: los documentos siguen, con su deletedAt.
    const enBase = await h.mongo.connection.db!.collection('mark').countDocuments({});
    expect(enBase).toBe(1);
  });
});

describe('marcas', () => {
  it('🔴 una marca fuera de la escala de su mira se rechaza y dice el rango', async () => {
    const { sightId, arrowSetId } = await armarMira();
    const res = await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 900,
    });

    expect(res.status).toBe(409);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'BS-MARK-409-002', params: { min: 0, max: 600 } },
    });
  });

  it('🔴 repetir una distancia con el mismo set es un conflicto explicito', async () => {
    // El arquero decide si reemplaza la que ya tenia; no se pisa en silencio.
    const { sightId, arrowSetId } = await armarMira();
    const marca = { arrowSetId, distanceM: 30, scaleValueMm: 120 };

    expect((await post(`/api/v1/sights/${sightId}/marks`, { id: uuid(), ...marca })).status).toBe(
      201,
    );
    const repetida = await post(`/api/v1/sights/${sightId}/marks`, { id: uuid(), ...marca });

    expect(repetida.status).toBe(409);
    await expect(repetida.json()).resolves.toMatchObject({ error: { code: 'BS-MARK-409-003' } });
  });

  it('la misma distancia con OTRO set de flechas si entra: es otra calibracion', async () => {
    const { sightId, arrowSetId } = await armarMira();
    const otroSet = uuid();
    await post('/api/v1/equipment/arrow-sets', { id: otroSet, name: 'Gold Tip' });

    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });
    const otra = await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId: otroSet,
      distanceM: 30,
      scaleValueMm: 145,
    });
    expect(otra.status).toBe(201);
  });

  it('no acepta un set de flechas de otro arquero', async () => {
    const otro = await nuevoArquero('otro@example.com');
    const setAjeno = uuid();
    await post('/api/v1/equipment/arrow-sets', { id: setAjeno, name: 'Ajeno' }, otro);

    const { sightId } = await armarMira();
    const res = await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId: setAjeno,
      distanceM: 30,
      scaleValueMm: 120,
    });
    expect(res.status).toBe(404);
  });

  it('🔴 una edicion con un updatedAt viejo responde 409, no pisa la marca', async () => {
    // Nunca last-write-wins silencioso: descartar sin avisar una marca medida
    // hace diez minutos en la linea de tiro es inaceptable (ADR-006).
    const { sightId, arrowSetId } = await armarMira();
    const id = uuid();
    await post(`/api/v1/sights/${sightId}/marks`, {
      id,
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });

    // Alguien edito desde otro dispositivo.
    await patch(`/api/v1/sights/${sightId}/marks/${id}`, { scaleValueMm: 125 });

    const tarde = await patch(`/api/v1/sights/${sightId}/marks/${id}`, {
      scaleValueMm: 130,
      baseUpdatedAt: '2020-01-01T00:00:00.000Z',
    });

    expect(tarde.status).toBe(409);
    await expect(tarde.json()).resolves.toMatchObject({ error: { code: 'BS-MARK-409-006' } });

    // Y la marca quedo como estaba.
    const lista = (await (await api(`/api/v1/sights/${sightId}/marks`)).json()) as {
      scaleValueMm: number;
    }[];
    expect(lista[0]?.scaleValueMm).toBe(125);
  });

  it('se filtran por set de flechas', async () => {
    const { sightId, arrowSetId } = await armarMira();
    const otroSet = uuid();
    await post('/api/v1/equipment/arrow-sets', { id: otroSet, name: 'Gold Tip' });

    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });
    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId: otroSet,
      distanceM: 40,
      scaleValueMm: 210,
    });

    const todas = await (await api(`/api/v1/sights/${sightId}/marks`)).json();
    expect(todas).toHaveLength(2);

    const soloUno = await (
      await api(`/api/v1/sights/${sightId}/marks?arrowSetId=${arrowSetId}`)
    ).json();
    expect(soloUno).toHaveLength(1);
  });
});

/** Cinco marcas reales, en milimetros, con la forma de una trayectoria. */
const MARCAS: Array<[distanciaM: number, escalaMm: number]> = [
  [20, 40],
  [30, 120],
  [40, 210],
  [50, 320],
  [60, 450],
];

async function miraCalibrada() {
  const { sightId, arrowSetId } = await armarMira();
  for (const [distanceM, scaleValueMm] of MARCAS) {
    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM,
      scaleValueMm,
    });
  }
  return { sightId, arrowSetId };
}

describe('la calculadora', () => {
  it('con menos de cinco marcas no calcula, y dice cuantas faltan', async () => {
    const { sightId, arrowSetId } = await armarMira();
    await post(`/api/v1/sights/${sightId}/marks`, {
      id: uuid(),
      arrowSetId,
      distanceM: 30,
      scaleValueMm: 120,
    });

    const res = await api(
      `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=35`,
    );
    expect(res.status).toBe(422);
    await expect(res.json()).resolves.toMatchObject({
      error: { code: 'BS-MARK-422-004', params: { have: 1, need: 5 } },
    });
  });

  it('🔴 devuelve EXACTAMENTE la marca que el arquero cargo en esa distancia', async () => {
    // Es la promesa del producto (ADR-001): los competidores ajustan una curva
    // que no pasa por ninguna de las marcas medidas.
    const { sightId, arrowSetId } = await miraCalibrada();

    for (const [distanceM, scaleValueMm] of MARCAS) {
      const res = await api(
        `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=${distanceM}`,
      );
      const body = (await res.json()) as { scaleValueMm: number; interpolated: boolean };

      expect(body.scaleValueMm, `a ${distanceM} m`).toBeCloseTo(scaleValueMm, 5);
      expect(body.interpolated).toBe(true);
    }
  });

  it('una distancia intermedia se interpola y queda entre sus vecinas', async () => {
    const { sightId, arrowSetId } = await miraCalibrada();
    const res = await api(
      `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=35`,
    );
    const body = (await res.json()) as { scaleValueMm: number; interpolated: boolean };

    expect(body.interpolated).toBe(true);
    expect(body.scaleValueMm).toBeGreaterThan(120);
    expect(body.scaleValueMm).toBeLessThan(210);
  });

  it('🔴 fuera del rango medido avisa que es estimado', async () => {
    // Presentar una estimacion como una medicion seria mentir sobre lo unico
    // que nos diferencia.
    const { sightId, arrowSetId } = await miraCalibrada();
    const res = await api(
      `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=18`,
    );
    await expect(res.json()).resolves.toMatchObject({ interpolated: false });
  });

  it('el corte por angulo usa la distancia horizontal, que es menor', async () => {
    const { sightId, arrowSetId } = await miraCalibrada();

    const plano = (await (
      await api(`/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=40`)
    ).json()) as { scaleValueMm: number };

    const cuestaAbajo = (await (
      await api(
        `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=40&angleDeg=-30`,
      )
    ).json()) as { scaleValueMm: number; horizontalDistanceM: number };

    // cos(30°) x 40 = 34.64
    expect(cuestaAbajo.horizontalDistanceM).toBeCloseTo(34.64, 1);
    // Menos distancia horizontal, marca mas baja.
    expect(cuestaAbajo.scaleValueMm).toBeLessThan(plano.scaleValueMm);
  });

  it('cuesta arriba y cuesta abajo dan lo mismo: importa el coseno', async () => {
    const { sightId, arrowSetId } = await miraCalibrada();
    const base = `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=40`;

    const arriba = (await (await api(`${base}&angleDeg=25`)).json()) as { scaleValueMm: number };
    const abajo = (await (await api(`${base}&angleDeg=-25`)).json()) as { scaleValueMm: number };

    expect(arriba.scaleValueMm).toBeCloseTo(abajo.scaleValueMm, 5);
  });

  it('informa la calidad del ajuste: es la base del Mark Doctor', async () => {
    const { sightId, arrowSetId } = await miraCalibrada();
    const res = await api(
      `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=35`,
    );
    const body = (await res.json()) as { fitQuality: number; computed: unknown[] };

    expect(body.fitQuality).toBeGreaterThanOrEqual(0);
    // Y las intermedias y la de sala, calculadas de una.
    expect(Array.isArray(body.computed)).toBe(true);
    expect(body.computed.length).toBeGreaterThan(0);
  });

  it('un angulo imposible se rechaza antes de calcular', async () => {
    const { sightId, arrowSetId } = await miraCalibrada();
    const res = await api(
      `/api/v1/sights/${sightId}/marks/calculate?arrowSetId=${arrowSetId}&distanceM=40&angleDeg=89`,
    );
    expect(res.status).toBe(400);
  });
});
