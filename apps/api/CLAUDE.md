# API — contexto de la app

Backend de Bow Sight. Monolito modular sobre Hono. Puerto de desarrollo: **3000**.
Documento de la app: [`docs/apps/api.md`](../../docs/apps/api.md).

## Alcance

`/api/v1/*` es el contrato del producto. Fuera del prefijo viven `/health` y `/ready`, que no
versionan con el, y —desde F2— los webhooks de cobro.

## Estructura

```
src/
  app.ts            arma la app y recibe sus dependencias
  index.ts          arranque: lee el entorno y levanta el server
  env.schema.ts     schema puro del entorno (no lee process.env, no corta)
  env.ts            cargador: corta el proceso si falta algo
  types.ts          AppEnv (contexto de Hono) y AppDeps
  auth/             Better Auth, rutas envueltas, requireAuth
  db/               conexion a Mongo, readiness y chequeo de transacciones
  notifications/    puerto de mail, plantillas ES/EN, Resend
  http/             requestId, cabeceras, errores tipados, error handler
  observability/    logger Pino
  openapi/          catalogo de rutas y generador del contrato
  routes/           health · docs
  modules/<mod>/    domain · application · infrastructure   (desde F0-15)
```

## Reglas de la casa

1. **El `userId` sale de la sesion.** Nunca del body, ni de la query, ni de un parametro. Un
   controller **no toca el modelo de Mongoose**: pasa por el repositorio, que lo inyecta.
2. **`domain/` sin Mongoose y sin Hono.** Y ojo con la distincion: el `domain/` de un modulo son
   las reglas de ese modulo; la matematica de marcas vive en `@bow-sight/domain`, un nivel afuera.
3. **Un modulo no importa nada de otro.** Se hablan por puerto o por evento. Lo bloquea ESLint.
4. **La API manda claves, nunca prosa.** El envelope lleva `messageKey` y `params`; el idioma lo
   resuelve el cliente. Un mensaje en español dentro de una respuesta HTTP es un desvio de spec.
5. **El codigo de error se declara antes de escribirlo**, en [`docs/errors.md`](../../docs/errors.md).
   Es Definition of Ready.
6. **`new Date()` esta prohibido**: Temporal, y el reloj se **inyecta** (`now` en `AppDeps`). Sin eso
   no se puede probar el vencimiento de un trial sin esperar catorce dias.
7. Paginacion por cursor. `skip` prohibido. `Idempotency-Key` en toda mutacion sincronizable.
   Soft delete por defecto.
8. **Nada de secretos en los logs.** El logger redacta password, token, cookie y authorization, pero
   eso es una red, no un permiso.

## Como se agrega un endpoint

1. Declarar sus codigos en `docs/errors.md`.
2. Escribir el test primero, **incluido el de aislamiento por usuario**.
3. Schema Zod en `@bow-sight/schemas` — el mismo que va a usar el front.
4. Dominio, caso de uso, infraestructura, en ese orden.
5. Registrar la ruta con sus schemas, sus codigos y **su fixture de ataque**. Sin el fixture, la
   suite de aislamiento no compila y el CI falla.
6. Agregar su entrada en `src/openapi/catalog.ts`. Sin ella, **`createApp` no levanta**: el contrato
   se arma leyendo las rutas montadas, y una ruta sin documentar rompe el arranque y el CI.

## Inyeccion de dependencias

`createApp(deps)` recibe `env`, `logger`, `now` e `isDatabaseReady`. No construye nada por dentro:
es lo que permite probar toda la app **sin levantar Mongo ni leer el entorno** (ver `tests/helpers.ts`).

## Auth

🔴 **Las rutas de auth van envueltas, no montadas.** Better Auth trae su propio handler y su propio
formato de error; montarlo tal cual dejaria un rincon de la API respondiendo distinto a todo lo
demas. Se llama a `auth.api.*` desde nuestras rutas y se traduce al envelope unico.

🔴 **El `userId` sale de `requireAuth` y de ningun otro lado.** Es el unico punto donde se lee la
sesion.

🔴 `planCode` es `input: false` en el modelo de usuario. Lo escriben los webhooks de cobro, nadie
mas: si fuera de entrada, cualquiera se pondria en `max` desde el registro.

Los enlaces de los mails apuntan a **rutas que existen** — la verificacion a una ruta propia que
redirige a la PWA, el reset a la pantalla de la PWA. Nunca a la ruta por defecto de Better Auth, que
no esta montada.

El envio es un **puerto** (`Mailer`): en memoria para los tests, consola para dev, Resend para
produccion. Ningun test toca la red.

## Base de datos

🔴 **Replica set obligatorio.** Se verifica al arrancar y, en `staging` o `prod`, un cluster que no
lo sea **corta el proceso**. Sin transacciones, un webhook de cobro puede dejar la suscripcion a
medias: alguien paga y sigue en Free.

Los cambios de esquema e indices van en `migrations/` con `migrate-mongo`, y corren **antes** del
deploy desde un solo lugar. Prohibido tocar Atlas a mano.

Los tests levantan su propio replica set en memoria (`tests/mongo.ts`): no hace falta tener Mongo
instalado para correrlos.

## El contrato

`GET /api/v1/docs` devuelve el OpenAPI, **generado desde `app.routes`**. La lista de rutas sale de la
app montada de verdad y la descripcion de cada una de `src/openapi/catalog.ts`; los cuerpos salen de
los mismos schemas de Zod que validan en runtime, via `z.toJSONSchema`.

🔴 **Una ruta montada sin entrada en el catalogo hace fallar `createApp`.** Es el gemelo del fixture
de ataque: la unica forma de que la documentacion no quede desactualizada es que no arranque cuando
lo esta. El test tambien verifica lo contrario —documentar algo que no existe manda a un integrador
a escribir codigo contra un 404— y que todo codigo de error citado este declarado en `docs/errors.md`.

🔴 **Se sirve JSON y nada mas.** Montar un visor significa cargar un script de un CDN en el **mismo
origen que la cookie de sesion**: quien controle ese CDN tendria ejecucion de codigo justo donde vive
`bs.session_token`.

Es publico y va **antes** de la zona protegida: un contrato que exige sesion para leerse no es un
contrato. El documento se arma sobre una **foto** de las rutas tomada al final de `createApp`, asi
que lo que alguien monte despues —el buzon de mails del arnes de E2E, por ejemplo— no entra.

## Healthchecks

🔴 El healthcheck de la plataforma apunta a **`/ready`**, no a `/health`. `/health` responde 200
mientras el proceso viva, aunque Mongo este caido; un servicio que responde pero no puede leer nada
no esta listo para recibir trafico.

## Comandos

`pnpm --filter @bow-sight/api dev` · `test` · `test:coverage` · `typecheck` · `lint`

Los tests de integracion levantan un **replica set en memoria**: las transacciones no existen sin el.
