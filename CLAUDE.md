# Bow Sight — contexto del proyecto

SaaS de **marcas de mira** para arqueros (es-AR + en). El arquero registra en que punto de la escala
va la mira a cada distancia, y la app calcula las que nunca tiro. 2 apps + API.

**La spec manda:** `docs/spec/BOW-SIGHT-SPEC.md`. Si algo queda fuera de spec, primero se actualiza
la spec, despues se codea.

## Stack

TypeScript `strict` · React 19 + TanStack (Query/Router/Table/Form) · Tailwind v4 · Zustand (estado
de UI) · Nuqs (estado en URL) · Motion · `vite-react-ssg` en la landing · PWA en la app del arquero ·
Hono + Mongoose 8 + MongoDB Atlas · Better Auth · Zod 4 · Temporal · Pino · i18next ·
Vitest + Playwright + MSW + mongodb-memory-server · pnpm + Turborepo · Railway.

Frontera de estado: **Query = servidor · Zustand = UI · Nuqs = filtros urleables.** Nunca duplicar
estado de servidor en Zustand.

## Estructura

```
apps/      api · pwa (app del arquero) · landing (sitio publico)
packages/  domain (math puro) · schemas (Zod) · types · ui · client · config
```

Backend = monolito modular: `apps/api/src/modules/<mod>/{domain,application,infrastructure}`.
Los modulos se comunican por interfaces o eventos de dominio, **nunca** importando el modelo de otro
modulo. Cada app tiene su propio `CLAUDE.md` con lo especifico.

## Comandos

`pnpm dev` · `pnpm test` · `pnpm lint` · `pnpm typecheck` · `pnpm build` (Turborepo, desde la raiz)

## Reglas no negociables

1. **El `userId` sale de la sesion**, nunca del body ni de la query. Todo query pasa por un
   repositorio que lo inyecta; prohibido usar el modelo de Mongoose en un controller. `userId`
   primero en todo indice compuesto. "No es tuyo" responde **404**, no 403.
   → `docs/adr/000-data-ownership.md`
2. **El dominio matematico es puro.** `@bow-sight/domain` no hace I/O, no conoce framework, no lee
   el reloj y no usa azar. El modelo **pasa exacto por las marcas que el arquero midio**: la fisica
   es semilla, nunca autoridad. → `docs/adr/001-empirical-first.md`
3. **Errores:** codigo `BS-<MOD>-<HTTP>-<NNN>` + respuesta unificada
   `{ success:false, error:{ code, messageKey, params, requestId, timestamp } }`.
   La API manda **claves, nunca prosa**: el idioma lo resuelve el cliente. → `docs/errors.md`
4. **Logs:** Pino JSON con `ts, level, env, service, module, action, requestId, userId, durationMs,
errorCode, msg, meta`. Nunca passwords, tokens ni datos de tarjeta.
5. **Validacion:** Zod en `@bow-sight/schemas`, compartido front/back. Prohibido duplicar reglas.
6. **Unidades:** se guarda canonico — distancias en **metros**, escala de mira en **milimetros**. La
   conversion a yardas, centimetros, pulgadas o clicks ocurre **solo en el borde de presentacion**.
   Nunca se guarda un valor ya convertido.
7. **Entitlements:** el limite se evalua **en el servidor, antes de escribir**. Esconder un boton no
   es una restriccion. Bajar de plan no borra nada: lo que excede queda `locked` — legible e
   imprimible, no editable.
8. **Estados:** solo por transicion explicita y validada. Nunca un `update` libre del campo.
9. **API:** prefijo `/api/v1` · paginacion cursor-based · `Idempotency-Key` en toda mutacion
   sincronizable y en los webhooks · soft delete por defecto.
10. **Idioma:** codigo, variables y commits en ingles. Documentacion en español (es-AR). UI en **ES
    y EN via catalogos** — ningun string de usuario hardcodeado.

## Prohibido

`any` · `console.log` · logica de negocio en componentes React · secretos en el repo o en el front ·
importar el modelo de otro modulo · duplicar estado de servidor en Zustand · cambios manuales en
Atlas (usar `migrate-mongo`) · probar en prod · `skip` para paginar · `new Date()` fuera del
traductor de persistencia (usar Temporal) · strings de usuario fuera de los catalogos · I/O dentro de
`@bow-sight/domain`.

## Definition of Done

Completo en la spec. Minimo para dar algo por terminado: tests pasando con la cobertura de su
criticidad · **test de aislamiento por usuario** · Zod compartido · error tipado con codigo
declarado en `docs/errors.md` · logs estructurados · estados vacio/carga/error · accesible (teclado,
foco, contraste, labels) · responsive 360/768/1440 · dark y light · **ES y EN completos** · OpenAPI
actualizado · entrada en `docs/BITACORA.md` · **tarjeta movida en Trello**.

## Tablero

https://trello.com/b/BNk4csCE — listas `Sin iniciar` / `En proceso` / `Completadas` / `Canceladas` /
`Bloqueadas`. El backlog vive en `docs/ACTION-PLAN.md` y se sincroniza con `/trello-sync`.

## Decisiones ya tomadas — no re-litigar

- `docs/adr/000-data-ownership.md` — el dueño de los datos es el arquero; aislamiento por `userId`
- `docs/adr/001-empirical-first.md` — PCHIP sobre las marcas medidas; la fisica es semilla
- `docs/adr/002-monorepo.md` — monorepo pnpm + Turborepo, monolito modular, tres apps
- `docs/adr/003-payments.md` — suscripcion con doble pasarela detras de un adaptador
- `docs/adr/004-landing-rendering.md` — la landing se prerenderiza con `vite-react-ssg`
- `docs/adr/005-i18n.md` — ES + EN desde el dia 1; la API devuelve claves
- `docs/adr/006-offline-writes.md` — la PWA es offline-first con cola de escritura
