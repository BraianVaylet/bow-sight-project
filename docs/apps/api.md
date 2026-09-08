# API — el backend

> Un solo deployable, monolito modular. Puerto de desarrollo: **3000**.

## Superficie

`/api/v1/*`. La documentacion viva esta en `/api/v1/docs`, generada **desde el mismo registro de
rutas** que usan los guards y la suite de aislamiento: no se escribe aparte, asi que no puede quedar
desactualizada.

Fuera del prefijo: `/health` (el proceso vive) y `/ready` (vive **y** Mongo responde). El healthcheck
de la plataforma apunta a `/ready`: un servicio que responde pero no puede leer nada no esta listo
para recibir trafico.

Los **webhooks de cobro** se montan fuera de `/api/v1`, sin CSRF y **sin el limitador por IP**:
Stripe reintenta desde IPs rotativas y un 429 hace que marque el endpoint como caido.

## Como se agrega un endpoint

1. Declarar sus codigos de error en [`errors.md`](../errors.md). Es Definition of Ready.
2. Escribir el test primero, incluido el de aislamiento por usuario.
3. Schema Zod en `@bow-sight/schemas` — el mismo que va a usar el front.
4. Dominio, caso de uso, infraestructura, en ese orden.
5. Registrar la ruta con sus schemas, sus codigos de error **y su fixture de ataque**. Sin el
   fixture, el CI no compila la suite de aislamiento y falla.

## Reglas de la casa

- `domain/` **sin Mongoose y sin Hono**.
- Un controller **no toca el modelo de Mongoose**: pasa por el repositorio, que inyecta el `userId`.
- Importar `domain/`, `application/` o `infrastructure/` de **otro** modulo esta bloqueado por
  ESLint. Se usa un puerto o un evento.
- La matematica de marcas **no vive aca**: esta en `@bow-sight/domain` y es pura.
- `new Date()` esta prohibido: Temporal, y el reloj se inyecta.
- Paginacion por cursor. `skip` esta prohibido.
- `Idempotency-Key` obligatoria en toda mutacion sincronizable y en los webhooks.
- Soft delete por defecto.

## Errores

`AppError` con su codigo de `docs/errors.md`. El handler global arma el envelope de la spec §5.0 y
loguea con `errorCode` y `requestId`.

🔴 **La respuesta lleva `messageKey` y `params`, nunca prosa.** El idioma lo resuelve el cliente
(ADR-005).

Un `catch` que solo loguea no cumple el Definition of Done.

## Build

Se empaqueta con **`tsup`** a un solo archivo ESM, con los paquetes del workspace inlineados.

No es una preferencia de herramienta: `@bow-sight/*` publica **TypeScript crudo** (`main` apunta a
`src/index.ts`), que `tsx` y Vitest transpilan al vuelo pero Node no puede cargar. Con `tsc` a
secas, `node dist/index.js` muere al arrancar con `ERR_MODULE_NOT_FOUND`. La alternativa —darle un
paso de build a cada paquete compartido— son seis builds mas y un orden de compilacion que
mantener, cuando el unico que necesita salida ejecutable es la API.

🔴 **Produccion corre el bundle, no `tsx`.** Un transpilador en el arranque de produccion es tiempo
de boot y una dependencia de desarrollo en la imagen final.

## Tests

Unitarios junto al codigo, integracion en `tests/`, contra un **replica set en memoria**: las
transacciones no existen sin el.

Todo endpoint nuevo necesita su test de aislamiento. El gate de cobertura es por criticidad y lo
aplica el CI: 95% donde hay plata o limites de plan.
