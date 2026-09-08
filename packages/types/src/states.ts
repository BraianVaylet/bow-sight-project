/**
 * Maquinas de estado del producto.
 *
 * Los estados se cambian SOLO por transicion explicita y validada. Nunca con un
 * update libre del campo.
 */

/** Planes del producto. El orden es de menor a mayor. */
export const PLAN_CODES = ['free', 'pro', 'max'] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

/** Estado de la suscripcion, unificado entre Stripe y Mercado Pago. */
export const SUBSCRIPTION_STATUSES = [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
  'incomplete',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

/** Pasarela de cobro. */
export const PAYMENT_PROVIDERS = ['stripe', 'mercadopago'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

/**
 * De donde sale una marca.
 * `measured` la tiro el arquero; `computed` la calculo el modelo; `seeded` la
 * genero la semilla balistica y todavia nadie la verifico en el campo.
 */
export const MARK_ORIGINS = ['measured', 'computed', 'seeded'] as const;
export type MarkOrigin = (typeof MARK_ORIGINS)[number];

/**
 * Estado de una mira frente al plan.
 * Al bajar de plan nada se borra: lo que excede el limite queda `locked`, que es
 * legible e imprimible pero no editable.
 */
export const SIGHT_STATUSES = ['active', 'locked', 'archived'] as const;
export type SightStatus = (typeof SIGHT_STATUSES)[number];

/** Invitacion a un coach para ver un perfil de mira en solo lectura. */
export const SHARE_STATUSES = ['pending', 'accepted', 'revoked'] as const;
export type ShareStatus = (typeof SHARE_STATUSES)[number];
