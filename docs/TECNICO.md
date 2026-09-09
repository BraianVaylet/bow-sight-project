# Documento tecnico — Bow Sight

> Stack, estructura, convenciones y como levantar el proyecto.
>
> **La prueba de que este documento sirve**: alguien que nunca vio el repo lo clona, sigue esta
> pagina y lo tiene corriendo sin preguntar nada. Si algo falla, el arreglo va aca, no en un mensaje.

---

## 1. Requisitos

| Herramienta | Version                | Por que                                                                                                  |
| ----------- | ---------------------- | -------------------------------------------------------------------------------------------------------- |
| Node        | 24 (`.nvmrc`)          | El proyecto declara `>=22`; el CI corre la del `.nvmrc`                                                  |
| pnpm        | 11.7.0                 | Fijado en `packageManager`. `corepack enable` lo resuelve solo                                           |
| MongoDB     | 7+ con **replica set** | Sin replica set no hay transacciones, y un webhook de cobro sin transaccion deja la suscripcion a medias |

MongoDB puede ser Atlas o local. Para desarrollo alcanza con un nodo en modo replica set; los tests
no necesitan nada instalado (levantan el suyo en memoria).

## 2. Levantarlo

```bash
corepack enable && pnpm install
```

### La forma rapida: sin instalar Mongo

Para **probar la app**, no hace falta base ni `.env`:

```bash
pnpm dev:sandbox
```

Levanta la API contra un Mongo **efimero en memoria, con replica set**, e imprime tres direcciones:
la API, el contrato, y un **buzon** (`/e2e/mails`) de donde se saca el enlace de verificacion, porque
no se manda correo de verdad. Con eso corriendo, en otra terminal:

```bash
pnpm dev
```

🔴 **Los datos se pierden al cerrarlo, y es a proposito.** Un sandbox que sobrevive tienta a usarlo
como si fuera un ambiente, y despues alguien se apoya en datos que nadie puede reproducir. Para
trabajar sobre datos que duren, seguir con lo de abajo.

### Con tu propia base

```bash
cp .env.example .env
```

Completar como minimo `MONGODB_URI` y `BETTER_AUTH_SECRET` (`openssl rand -base64 32`). La API valida
el entorno al arrancar y **no levanta si falta algo**: es preferible fallar en el deploy que a las 3
de la mañana con un `undefined`.

```bash
pnpm exec migrate-mongo up
```

```bash
pnpm dev
```

| App     | Puerto | Que es          |
| ------- | ------ | --------------- |
| api     | 3000   | Backend         |
| pwa     | 5173   | App del arquero |
| landing | 5176   | Sitio publico   |

La documentacion de la API queda en `http://localhost:3000/api/v1/docs`.

## 3. Comandos

| Comando              | Que hace                                                |
| -------------------- | ------------------------------------------------------- |
| `pnpm dev`           | Las tres apps en watch                                  |
| `pnpm dev:sandbox`   | La API con una base efimera: para probar sin instalar   |
| `pnpm test`          | Unitarios e integracion de todos los paquetes           |
| `pnpm test:coverage` | Lo mismo, aplicando el gate de cobertura por criticidad |
| `pnpm test:e2e`      | Los caminos criticos en Playwright, con su base efimera |
| `pnpm lint`          | ESLint con las reglas del proyecto                      |
| `pnpm typecheck`     | `tsc --noEmit` en todo, incluido `e2e/`                 |
| `pnpm build`         | Build de produccion de las tres apps                    |
| `pnpm docs:links`    | Verifica que no haya enlaces rotos en `docs/`           |

Todo corre desde la raiz, con Turborepo.

## 4. Stack

**Backend:** TypeScript `strict` · Hono · Mongoose 8 · MongoDB · Better Auth · Zod 4 · Temporal ·
Pino · Resend.

**Frontend:** React 19 · TanStack Query / Router / Table / Form · Tailwind v4 · Zustand · Nuqs ·
Motion · i18next · `vite-react-ssg` en la landing · PWA en la app del arquero.

**Testing:** Vitest · Testing Library · MSW · `mongodb-memory-server` · Playwright.

**Tooling:** pnpm + Turborepo · ESLint + Prettier · husky + lint-staged · migrate-mongo.

## 5. Estructura

```
apps/
  api/        backend (monolito modular)
  pwa/        app del arquero
  landing/    sitio publico
packages/
  domain/     math puro: PCHIP, ruler, unidades, balistica. Sin I/O
  schemas/    Zod — fuente unica de validacion, front y back
  types/      tipos y maquinas de estado del dominio
  ui/         primitivas accesibles con tokens y tema
  client/     cliente de API, estado de UI, i18n
  config/     tsconfig y eslint compartidos
e2e/          los caminos criticos (Playwright) y su arnes
migrations/   migrate-mongo — indices y datos de arranque
docs/         esta carpeta
```

Cada app tiene su propio `CLAUDE.md` con lo especifico.

## 6. Convenciones que no se negocian

### Idioma

**Codigo, variables, commits y mensajes de PR en ingles. Documentacion en español rioplatense. La UI
en español y en ingles, siempre via catalogos.** Los comentarios del codigo van en español: explican
por que, y el por que se discute en el idioma en que se piensa.

🔴 **Ningun string de usuario hardcodeado.** Ni en la UI, ni en la API. La API manda claves.

### El dominio es puro

`@bow-sight/domain` no hace I/O, no conoce framework, no lee el reloj y no usa azar. Lo bloquea
ESLint. Si una funcion de marcas necesita la base para decidir, no es dominio.

🔴 **El modelo pasa exacto por las marcas medidas.** Es la promesa del producto (ADR-001) y tiene su
test permanente.

### Unidades

**Canonico: distancias en metros, escala de mira en milimetros.** La conversion a yardas,
centimetros, pulgadas o clicks ocurre **solo en el borde de presentacion**. Nunca se guarda un valor
ya convertido: un dato convertido es un dato con una unidad implicita, y las unidades implicitas son
la forma mas cara de perder informacion.

### Estado en el front

- **TanStack Query** para el estado del servidor.
- **Zustand** para el estado de la UI.
- **Nuqs** para los filtros que van en la URL.

Nunca duplicar estado de servidor en Zustand.

### Fechas

**Temporal, siempre.** `new Date()` esta prohibido por ESLint fuera del traductor de persistencia,
que es el unico lugar que traduce entre Temporal y lo que Mongo guarda.

El reloj se **inyecta** (`now: () => Temporal.Instant`): sin eso no se puede probar el vencimiento de
un trial sin esperar catorce dias.

### Dinero

**Centavos enteros, siempre.** Nunca decimales, en ningun punto del camino. El campo `currency`
existe desde el dia uno.

### Errores

Cada error tiene su codigo `BS-<MOD>-<HTTP>-<NNN>`, declarado en [errors.md](errors.md) **antes** de
escribirlo. La respuesta lleva `messageKey` y `params`, nunca prosa. Un `catch` que solo loguea no
cumple el Definition of Done.

### Logs

Pino en JSON, el mismo formato en todos lados: `ts, level, env, service, module, action, requestId,
userId, durationMs, errorCode, msg, meta`.

**Nunca se loguean** contraseñas, tokens ni datos de tarjeta.

### Validacion

Zod en `@bow-sight/schemas`, compartido entre el front y el back. **Prohibido duplicar una regla de
validacion**: si esta en dos lados, un dia van a decir cosas distintas.

### API

Prefijo `/api/v1` · paginacion por cursor (nunca `skip`) · `Idempotency-Key` obligatoria en toda
mutacion sincronizable y en los webhooks · soft delete por defecto.

Los webhooks de cobro se montan **fuera** de `/api/v1` y fuera del limitador por IP.

## 7. Tests

```bash
pnpm test
```

Unitarios junto al codigo (`*.test.ts`), integracion en `apps/api/tests/`. La integracion levanta un
**replica set en memoria**.

**Los siete tests que no se negocian** estan en la spec §6.5. El primero y el segundo son los que
sostienen el producto: aislamiento por usuario en cada endpoint, y que el modelo pase exacto por
cada marca medida.

### Cobertura

El gate es por criticidad, no un numero global: 95% en `@bow-sight/domain`, entitlements y billing;
85% en marcas, unidades, auth y sharing; menos donde el riesgo es menor; 80% o mas global. Lo aplica
el CI.

### E2E

```bash
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
```

Contra un Mongo **efimero** que se crea y se tira. Nunca contra staging ni contra produccion: estos
tests escriben.

Playwright levanta tres servidores: la API del arnes (`e2e/support/api-server.ts`, con su Mongo en
memoria en replica set), la PWA y la landing en modo dev. Corre en dos proyectos, `mobile` (Pixel 7)
y `chromium`; el mobile no es un extra, es el caso principal.

🔴 **Los puertos de dev estan fijos con `strictPort`.** `vite-react-ssg dev` ignora `--port`, asi que
la landing se levantaba en el 5173, chocaba con la PWA y se corria sola al 5174 sin decir nada. Con
`strictPort`, un puerto ocupado falla en vez de moverse.

El arnes expone `GET /e2e/mails` y `DELETE /e2e/mails`, que **solo existen ahi**: es la unica forma de
verificar de punta a punta que el mail de verificacion lleva a nuestra ruta.

## 8. Git y CI

Commits convencionales, con el scope de la lista de `commitlint.config.js`. El hook de pre-commit
corre Prettier y ESLint sobre lo que esta en el stage.

El CI corre, en este orden: formato, enlaces de la documentacion, lint, typecheck, **build**, tests
con el gate de cobertura, los E2E y la auditoria de dependencias. El build va **antes** de los tests
a proposito: los tests de la landing verifican el HTML prerenderizado, que solo existe despues de
buildear.

## 9. Base de datos

Los cambios de esquema y de indices van en `migrations/`, con `migrate-mongo`. **Prohibido tocar
Atlas a mano**: lo que se hizo a mano en un ambiente no existe en el otro.

Las migraciones corren **antes** del deploy y desde un solo lugar. Si las corriera el arranque del
proceso, dos instancias las correrian a la vez.

## 10. Donde seguir

- [ARQUITECTURA.md](ARQUITECTURA.md) — aislamiento, modulos, eventos y jobs.
- [FUNCIONAL.md](FUNCIONAL.md) — que hace el producto.
- [errors.md](errors.md) — el diccionario de codigos de error.
- [ACTION-PLAN.md](ACTION-PLAN.md) — el backlog, con lo hecho y lo que falta.
- [BITACORA.md](BITACORA.md) — que cambio, cuando y por que.
- [runbook-staging.md](runbook-staging.md) — deploy y vuelta atras.
- [domain/SIGHT-MATH.md](domain/SIGHT-MATH.md) — la matematica de las marcas.
- [adr/](adr/) — las decisiones cerradas, que no se re-discuten.
- [apps/](apps/) — un documento por aplicacion.
