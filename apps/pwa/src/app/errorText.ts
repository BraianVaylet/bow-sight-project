import type { ApiError } from '@bow-sight/client';

/**
 * Traduce una clave de error a texto.
 *
 * 🔴 Es un **puente provisorio**. La API manda claves (ADR-005) y el catalogo
 * real llega con i18next en F1-A; hasta entonces esto vive aca, en español, y
 * su unico trabajo es no dejar al arquero mirando un codigo.
 *
 * Cuando entre i18n, este archivo se reemplaza por `t(error.messageKey, params)`
 * y el mapa se muda a los catalogos.
 */
const TEXTOS: Record<string, (p: Record<string, string | number>) => string> = {
  'errors.network.offline': () => 'Sin conexion. Lo que veas puede estar desactualizado.',
  'errors.auth.invalidCredentials': () => 'Email o contraseña incorrectos.',
  'errors.auth.sessionExpired': () => 'Tu sesion venció. Entrá de nuevo.',
  'errors.auth.emailNotVerified': () => 'Confirmá tu email para poder seguir.',
  'errors.auth.emailTaken': () => 'Ese email ya tiene una cuenta.',
  'errors.auth.tooManyAttempts': () => 'Demasiados intentos. Probá en unos minutos.',
  'errors.auth.badToken': () => 'Ese enlace no sirve o ya venció.',
  'errors.auth.badResetToken': () => 'Ese enlace de recupero no sirve o ya venció.',
  'errors.sight.notFound': () => 'No encontramos esa mira.',
  'errors.sight.badScaleRange': () => 'La escala mínima tiene que ser menor que la máxima.',
  'errors.sight.marksOutsideNewRange': (p) =>
    `Con esa escala, ${p['count']} marca(s) quedarían afuera. Borralas o ampliá el rango.`,
  'errors.sight.locked': () => 'Esta mira está bloqueada por tu plan: se puede leer e imprimir.',
  'errors.sight.missingClickSize': () =>
    'Para una escala en clicks hace falta decir cuánto mueve cada click.',
  'errors.mark.notFound': () => 'No encontramos esa marca.',
  'errors.mark.badDistance': (p) =>
    `La distancia tiene que estar entre ${p['min']} y ${p['max']} m.`,
  'errors.mark.badAngle': (p) =>
    `El ángulo tiene que estar entre ${p['min']}° y ${p['max']}°. Revisá la inclinación.`,
  'errors.mark.outOfScale': (p) =>
    `La marca tiene que estar entre ${p['min']} y ${p['max']} mm de la escala.`,
  'errors.mark.duplicateDistance': (p) => `Ya tenés una marca a ${p['distanceM']} m con ese set.`,
  'errors.mark.notEnoughMarks': (p) =>
    `Cargá ${Number(p['need']) - Number(p['have'])} marca(s) más para desbloquear el cálculo.`,
  'errors.mark.staleWrite': () =>
    'Esta marca cambió en otro dispositivo. Revisá cuál querés dejar.',
  'errors.equipment.arrowSetInUse': (p) =>
    `Ese set tiene ${p['count']} marca(s) cargadas. Borralas o reasignalas primero.`,
  'errors.equipment.notFound': () => 'No encontramos ese equipo.',
  'errors.equipment.incompleteSpecs': () =>
    'Faltan datos del equipo para estimar el tiro: velocidad, peso de la flecha y altura del peep.',
  'errors.system.validation': () => 'Revisá los datos: hay algo que no cierra.',
  'errors.system.rateLimited': () => 'Demasiadas peticiones. Esperá un momento.',
  'errors.system.internal': () => 'Se rompió algo de nuestro lado. Probá de nuevo en un momento.',
};

export function useErrorText() {
  return (error: ApiError): string => {
    const build = TEXTOS[error.messageKey];
    if (build) return build(error.params ?? {});
    // Sin traduccion, el codigo: es feo, pero es lo que soporte necesita.
    return `Algo salió mal (${error.code}).`;
  };
}
