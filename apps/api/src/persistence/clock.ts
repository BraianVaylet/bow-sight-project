import { Temporal } from '@js-temporal/polyfill';

/**
 * El traductor entre Temporal y lo que Mongo guarda.
 *
 * 🔴 **Este es el unico lugar del proyecto donde se permite `new Date()`**, y es
 * la excepcion que la regla contempla: el driver de Mongo persiste `Date`, asi
 * que en algun punto hay que construir uno. Aca, en una funcion de tres lineas
 * que se ve entera, y no repartido por los servicios.
 *
 * Todo lo demas usa Temporal, y el reloj se **inyecta**: sin eso no se puede
 * probar el vencimiento de un trial sin esperar catorce dias.
 */
export function toBsonDate(instant: Temporal.Instant): Date {
  // eslint-disable-next-line no-restricted-syntax -- traductor de persistencia
  return new Date(instant.epochMilliseconds);
}

/** Reloj de produccion. En los tests se inyecta uno fijo. */
export function systemClock(): Date {
  return toBsonDate(Temporal.Now.instant());
}
