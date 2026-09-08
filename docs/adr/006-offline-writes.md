# ADR-006 — La PWA es offline-first con cola de escritura

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §5.1, §12

## Contexto

Bow Sight se usa **en la linea de tiro**: al aire libre, con guantes, y en campos que suelen no
tener señal. Es exactamente el momento en que el arquero acaba de tirar una tanda y quiere anotar la
marca que le funciono, antes de olvidarsela.

`bv-bow-sight` es una PWA **de solo lectura**: cachea los GET con `NetworkFirst`, persiste el cache
de TanStack Query en `localStorage`, y **deshabilita todos los botones de escritura** cuando
`navigator.onLine` es falso. Consultar funciona; anotar no.

El proyecto hermano `bv-bahia-archers-league` ya resolvio este problema exacto —anotar puntajes
caminando por el monte— y tiene un outbox andando en produccion.

## Opciones consideradas

1. **Dejarlo en solo lectura.** Es lo que hay hoy y no cuesta nada. Pero pide justo lo que el
   producto no puede pedir: que el arquero recuerde la marca hasta volver a tener señal.
2. **Escritura optimista sin cola.** La UI responde al instante, pero si no hay red la mutacion
   falla y se pierde. Es peor que deshabilitar el boton, porque el arquero cree que quedo guardado.
3. **Cola de escritura persistida**, con reanudacion al reconectar e idempotencia en el servidor.

## Decision

**Opcion 3.** Se porta y adapta el patron de `bv-bahia-archers-league`, no se inventa de nuevo.

- **Persistencia en IndexedDB**, no en `localStorage`: son 5 MB, es sincrono —hace jank en cada
  escritura— y no sirve para guardar una cola.
- **Las mutaciones se persisten y se reanudan.** Cada mutacion se registra con su clave, porque una
  mutacion deserializada llega sin su funcion.
- **La cola es serializada.** Una marca creada sin conexion referencia una mira que tambien puede
  haberse creado sin conexion: si el POST de la marca sale primero, responde 404. El orden no es un
  detalle, es la diferencia entre funcionar y perder datos.
- **Los ids los genera el cliente.** Sin eso haria falta reescribir el id temporal por el real en
  cada query cacheada y en cada hijo — que es donde mueren las implementaciones offline.
- **`Idempotency-Key` en el servidor**, con su tabla y su TTL: reconectar y reintentar no puede
  crear dos veces la misma marca.
- **Conflictos: concurrencia optimista, nunca last-write-wins silencioso.** Cada PATCH manda el
  `updatedAt` que el cliente vio; si el servidor tiene uno mas nuevo, responde 409 y la UI pregunta.
  El conflicto aca es siempre la misma persona en dos dispositivos, asi que es raro — pero descartar
  en silencio una marca medida hace diez minutos en la linea de tiro es inaceptable.
- **Login, registro y cobro quedan online-only.** No se puede encolar un handshake de autenticacion
  ni un pago.
- El estado de red no se decide con `navigator.onLine`: en un campo de tiro con una barra de señal
  o un portal cautivo devuelve `true` y las mutaciones se reanudan contra un pozo. Se usa una sonda
  real contra el healthcheck.

## Consecuencias

- Se hace **al final**, despues de que el formato del wire este congelado. Una cola serializada con
  el formato viejo, reanudada despues de un deploy que espera el nuevo, reintenta para siempre. Por
  eso cada mutacion encolada se estampa con la version del schema y se descarta —avisandole al
  usuario— si no coincide con el bundle que esta corriendo.
- Hay que quitar los guardas de `useOnlineStatus` que hoy deshabilitan cada boton, salvo en login,
  registro y cobro.
- La UI gana una superficie nueva: cuantos cambios hay pendientes y cuando se sincronizaron. Sin eso
  el arquero no sabe si su marca esta a salvo, que es justo la ansiedad que la feature viene a
  resolver.
- Es la parte del producto con mas superficie de bugs sutiles. Tiene test de punta a punta propio:
  crear sin conexion, reconectar, verificar en el servidor, sin duplicados.
