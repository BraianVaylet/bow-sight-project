# ADR-002 — Monorepo, arquitectura de backend e infraestructura

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §6

## Contexto

Bow Sight nace de `bv-bow-sight`, una app personal de un solo servicio con SQLite. Como producto
comercial tiene que sostener dos frentes distintos: un sitio publico que necesita rankear en
buscadores y una app que se usa en la linea de tiro, sin señal, y que va a cobrar suscripciones.

Lo desarrolla una persona. El proyecto hermano `laplace-project` ya resolvio esta forma y esta en
produccion; copiarla evita re-descubrir los mismos problemas.

## Opciones consideradas

1. **Seguir con el servicio unico de `bv-bow-sight`** (Hono sirve la SPA y la API, SQLite en un
   volumen). Es lo mas barato y ya funciona. Pero no tiene migraciones, `better-sqlite3` es sincrono
   y bloquea el event loop, y meter la landing prerenderizada en el mismo proceso mezcla dos ciclos
   de vida que no tienen nada que ver.
2. **Microservicios.** Un servicio por modulo multiplicaria el costo de operacion sin resolver
   ningun problema que hoy exista.
3. **Monorepo pnpm + Turborepo, monolito modular, tres deployables.**

## Decision

**Opcion 3**, espejo de `laplace-project`.

- **Monorepo** con `pnpm` workspaces y Turborepo. `apps/{api,pwa,landing}` y
  `packages/{domain,schemas,types,ui,client,config}`.
- **Backend: monolito modular.** `apps/api/src/modules/<mod>/{domain,application,infrastructure}`.
  `domain/` no conoce Mongoose ni Hono. Un modulo no importa nada de otro: se hablan por interfaz o
  por evento de dominio, y lo bloquea ESLint (`no-restricted-imports`).
- **Un paquete extra respecto de Laplace: `packages/domain`.** Laplace no lo necesita porque su
  dominio vive dentro de los modulos de la API. Aca la matematica de marcas la consumen la API, la
  PWA, la landing (para la demo interactiva) y los tests, asi que tiene que ser un paquete puro sin
  I/O. Es el activo tecnico del producto (ADR-001): merece su propio paquete y su propio gate de
  cobertura.
- **Tres deployables** en Railway, uno por app, cada uno con su `railway.json`.
- **MongoDB Atlas con replica set** y `migrate-mongo`. Prohibido tocar Atlas a mano.
- **Better Auth** para identidad: email y contraseña, verificacion, reset y OAuth.

## Consecuencias

- Se abandona SQLite. A cambio se gana migraciones versionadas, transacciones reales para los
  webhooks de cobro y point-in-time recovery, que un producto pago necesita.
- Los datos reales del autor se migran una sola vez con un script; `better-sqlite3` queda como
  dependencia **de desarrollo** solo para ese script.
- El replica set es un requisito, no una preferencia: sin el no hay transacciones, y sin
  transacciones un webhook puede dejar una suscripcion a medias. Tambien en los tests, que levantan
  el suyo en memoria.
- La landing y la PWA se despliegan por separado: un cambio de copy en el sitio no reinicia la app
  que alguien esta usando en el campo de tiro.
- Tres procesos cuestan mas que uno. Es el precio de que la landing sea estatica y cacheable, y de
  que un pico de trafico en el sitio publico no toque a la API.
