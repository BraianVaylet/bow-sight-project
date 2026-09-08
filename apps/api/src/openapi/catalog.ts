import {
  arrowSetCreateSchema,
  arrowSetUpdateSchema,
  bowSetupCreateSchema,
  bowSetupUpdateSchema,
  markCreateSchema,
  markQuerySchema,
  markUpdateSchema,
  sightCreateSchema,
  sightUpdateSchema,
} from '@bow-sight/schemas';
import type { ZodType } from 'zod';

/**
 * Que hace cada ruta, y con que forma.
 *
 * 🔴 Esto es **la mitad** de la documentacion. La otra mitad —que rutas existen—
 * sale de `app.routes`, o sea de la app montada de verdad. Un endpoint nuevo sin
 * su entrada aca hace fallar `buildOpenApi`, y con el, el CI. Es la misma idea
 * que el fixture de ataque de la suite de aislamiento: la unica forma de que la
 * documentacion no se desactualice es que no compile cuando lo hace.
 *
 * Los cuerpos **no se describen a mano**: salen de los mismos schemas de Zod que
 * validan en runtime, via `z.toJSONSchema`. Escribir el JSON Schema aparte seria
 * la tercera copia de una regla que ya vive en un solo lugar.
 */
export interface RouteDoc {
  summary: string;
  description?: string;
  tag: string;
  /** El schema del cuerpo, si lo lleva. */
  body?: ZodType;
  /** Parametros de query, si los lleva. */
  query?: ZodType;
  /** Codigos de error propios, ademas de los del sistema. */
  errors?: string[];
  /** Que devuelve. Por defecto `200`. */
  status?: number;
  /** Rutas publicas: no exigen sesion. */
  publica?: true;
}

/** Clave: `METHOD /ruta/con/:params`, tal cual la reporta Hono. */
export const CATALOG: Record<string, RouteDoc> = {
  // ── Salud ───────────────────────────────────────────────────────
  'GET /health': {
    summary: 'El proceso esta vivo',
    description:
      'Responde 200 mientras el proceso viva, **aunque Mongo este caido**. No sirve como healthcheck de la plataforma: para eso esta `/ready`.',
    tag: 'salud',
    publica: true,
  },
  'GET /ready': {
    summary: 'La API puede atender pedidos',
    description:
      'Verifica la conexion a Mongo de verdad. Responde 503 si no puede leer. Es el healthcheck que mira la plataforma.',
    tag: 'salud',
    publica: true,
  },

  'GET /api/v1/docs': {
    summary: 'Este contrato',
    description:
      'Se documenta a si mismo. Solo JSON: un visor se monta cargando un script de un CDN, y ese script correria en el **mismo origen que la cookie de sesion**.',
    tag: 'salud',
    publica: true,
  },

  // ── Identidad ───────────────────────────────────────────────────
  'POST /api/v1/auth/sign-up': {
    summary: 'Crear cuenta',
    description: 'Manda el mail de verificacion. La cuenta queda usable pero sin verificar.',
    tag: 'auth',
    errors: ['BS-AUTH-409-004'],
    publica: true,
  },
  'POST /api/v1/auth/sign-in': {
    summary: 'Entrar',
    description:
      'Un email inexistente y una contraseña incorrecta responden **lo mismo**: distinguirlos convertiria este endpoint en un buscador de cuentas.',
    tag: 'auth',
    errors: ['BS-AUTH-401-001'],
    publica: true,
  },
  'POST /api/v1/auth/sign-out': { summary: 'Salir', tag: 'auth' },
  'GET /api/v1/auth/me': { summary: 'La sesion actual', tag: 'auth' },
  'GET /api/v1/auth/verify-email': {
    summary: 'Volver del mail de verificacion',
    description:
      'Redirige a la PWA con el resultado. Es **nuestra** ruta, no la de Better Auth: la de Better Auth no esta montada, y un mail que lleva a un 404 deja la cuenta sin verificar para siempre.',
    tag: 'auth',
    status: 302,
    errors: ['BS-AUTH-400-006'],
    publica: true,
  },
  'POST /api/v1/auth/verify-email/resend': {
    summary: 'Reenviar el mail de verificacion',
    tag: 'auth',
    publica: true,
  },
  'POST /api/v1/auth/password-reset/request': {
    summary: 'Pedir el enlace de recupero',
    description:
      'Responde 204 **siempre**, exista o no la cuenta. Confirmar que un email esta registrado es filtrar quien tiene cuenta.',
    tag: 'auth',
    status: 204,
    publica: true,
  },
  'POST /api/v1/auth/password-reset/confirm': {
    summary: 'Escribir la contraseña nueva',
    description:
      'Invalida **todas** las sesiones abiertas: si alguien entro, deja de estar dentro.',
    tag: 'auth',
    errors: ['BS-AUTH-400-007'],
    publica: true,
  },

  // ── Equipo ──────────────────────────────────────────────────────
  'GET /api/v1/equipment/bow-setups': { summary: 'Listar arcos', tag: 'equipo' },
  'POST /api/v1/equipment/bow-setups': {
    summary: 'Crear un arco',
    tag: 'equipo',
    body: bowSetupCreateSchema,
    status: 201,
  },
  'GET /api/v1/equipment/bow-setups/:id': {
    summary: 'Ver un arco',
    tag: 'equipo',
    errors: ['BS-EQUIP-404-001'],
  },
  'PATCH /api/v1/equipment/bow-setups/:id': {
    summary: 'Editar un arco',
    tag: 'equipo',
    body: bowSetupUpdateSchema,
    errors: ['BS-EQUIP-404-001'],
  },
  'DELETE /api/v1/equipment/bow-setups/:id': {
    summary: 'Borrar un arco',
    description: 'Soft delete: el documento queda, con `deletedAt`.',
    tag: 'equipo',
    status: 204,
    errors: ['BS-EQUIP-404-001'],
  },
  'GET /api/v1/equipment/arrow-sets': { summary: 'Listar sets de flechas', tag: 'equipo' },
  'POST /api/v1/equipment/arrow-sets': {
    summary: 'Crear un set de flechas',
    tag: 'equipo',
    body: arrowSetCreateSchema,
    status: 201,
  },
  'GET /api/v1/equipment/arrow-sets/:id': {
    summary: 'Ver un set de flechas',
    tag: 'equipo',
    errors: ['BS-EQUIP-404-001'],
  },
  'PATCH /api/v1/equipment/arrow-sets/:id': {
    summary: 'Editar un set de flechas',
    tag: 'equipo',
    body: arrowSetUpdateSchema,
    errors: ['BS-EQUIP-404-001'],
  },
  'DELETE /api/v1/equipment/arrow-sets/:id': {
    summary: 'Borrar un set de flechas',
    description:
      'Se **bloquea** si tiene marcas cargadas: son meses de datos y no se pierden en silencio.',
    tag: 'equipo',
    status: 204,
    errors: ['BS-EQUIP-404-001', 'BS-EQUIP-409-002'],
  },

  // ── Miras ───────────────────────────────────────────────────────
  'GET /api/v1/sights': { summary: 'Listar miras', tag: 'miras' },
  'POST /api/v1/sights': {
    summary: 'Crear una mira',
    tag: 'miras',
    body: sightCreateSchema,
    status: 201,
    errors: ['BS-SIGHT-400-002', 'BS-SIGHT-400-005'],
  },
  'GET /api/v1/sights/:id': {
    summary: 'Ver una mira',
    tag: 'miras',
    errors: ['BS-SIGHT-404-001'],
  },
  'PATCH /api/v1/sights/:id': {
    summary: 'Editar una mira',
    description: 'Achicar la escala se **bloquea** si dejaria marcas afuera del rango nuevo.',
    tag: 'miras',
    body: sightUpdateSchema,
    errors: ['BS-SIGHT-404-001', 'BS-SIGHT-400-002', 'BS-SIGHT-409-003', 'BS-SIGHT-400-005'],
  },
  'DELETE /api/v1/sights/:id': {
    summary: 'Borrar una mira',
    description: 'Arrastra sus marcas, tambien con soft delete.',
    tag: 'miras',
    status: 204,
    errors: ['BS-SIGHT-404-001'],
  },

  // ── Marcas ──────────────────────────────────────────────────────
  'GET /api/v1/sights/:sightId/marks': {
    summary: 'Listar las marcas de una mira',
    tag: 'marcas',
    errors: ['BS-SIGHT-404-001'],
  },
  'POST /api/v1/sights/:sightId/marks': {
    summary: 'Cargar una marca medida',
    description:
      'Solo `measured`: `computed` lo calcula el modelo y `seeded` lo hara la balistica, y ninguna de las dos se guarda como si el arquero la hubiera tirado (ADR-001).',
    tag: 'marcas',
    body: markCreateSchema,
    status: 201,
    errors: ['BS-SIGHT-404-001', 'BS-MARK-409-002', 'BS-MARK-409-003'],
  },
  'PATCH /api/v1/sights/:sightId/marks/:id': {
    summary: 'Editar una marca',
    description:
      'Con `baseUpdatedAt` viaja el `updatedAt` que el cliente vio. Si el servidor tiene uno mas nuevo responde 409: **nunca last-write-wins silencioso** (ADR-006).',
    tag: 'marcas',
    body: markUpdateSchema,
    errors: ['BS-MARK-404-001', 'BS-MARK-409-002', 'BS-MARK-409-006'],
  },
  'DELETE /api/v1/sights/:sightId/marks/:id': {
    summary: 'Borrar una marca',
    tag: 'marcas',
    status: 204,
    errors: ['BS-MARK-404-001'],
  },
  'GET /api/v1/sights/:sightId/marks/calculate': {
    summary: 'Calcular la marca a cualquier distancia',
    description:
      '🔴 **El corazon del producto.** A una distancia medida devuelve **exactamente** la marca cargada; entre marcas interpola con PCHIP monotono; afuera del rango extrapola con una parabola y lo dice en `interpolated`. Con `angleDeg` corta por la regla del coseno y usa la distancia horizontal.',
    tag: 'marcas',
    query: markQuerySchema,
    errors: ['BS-SIGHT-404-001', 'BS-MARK-422-004'],
  },
};
