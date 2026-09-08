# Plan de accion — Bow Sight

> **Backlog vivo:** cada tarea se marca `[x]` al cumplir el Definition of Done (spec §14). El orden
> es de prioridad y de dependencia: una tarea no arranca si sus `depends_on` no estan cerradas.

- **Spec:** `docs/spec/BOW-SIGHT-SPEC.md` v1.0
- **Tablero:** https://trello.com/b/BNk4csCE
- **Formato de tarea:** title, module, description, acceptance-criteria, example, story-points,
  depends_on, risk, test_plan, error-codes, data-model-impact
- **Escala:** Fibonacci 1/2/3/5/8/13. Ninguna tarea supera 8: toda tarea de 13 se parte antes de
  empezar.
- **Regla de corte:** ninguna fase arranca sin que la anterior este en produccion, usada por gente
  real.

## Estado

| Fase                         |   Tareas | Story points | Hechas |
| ---------------------------- | -------: | -----------: | -----: |
| Fase 0 — Fundaciones         |       21 |           97 |     19 |
| Fase 1 — Paridad competitiva | 8 epicas |         ~110 |      0 |
| Fase 2 — Monetizacion        | 6 epicas |          ~90 |      0 |
| Fase 3 — Offline-first       | 4 epicas |          ~55 |      0 |
| Fase 4 — Diferenciacion      | 5 epicas |          ~95 |      0 |
| Fase 5 — Salida al mercado   | 6 epicas |          ~60 |      0 |

---

# Fase 0 — Fundaciones

> El repo, los documentos, el dominio portado y las tres apps levantando. Nada de esto se le muestra
> a un usuario, y sin nada de esto se puede construir lo que si.

## [x] F0-01 · Monorepo: pnpm + Turborepo + workspaces

- **module:** infra
- **description:** El esqueleto del monorepo: `apps/*`, `packages/*`, y los tsconfig y eslint
  compartidos en `@bow-sight/config`. Es lo que hace que `turbo run <task>` se abra en abanico sobre
  todo el repo.
- **acceptance-criteria:**
  - Dado el repo clonado, cuando se corre `pnpm install`, entonces resuelve el workspace sin errores.
  - Dado cualquier paquete, cuando se lo inspecciona, entonces expone los mismos cuatro scripts:
    `lint`, `typecheck`, `test`, `test:coverage`.
  - Dado `turbo.json`, cuando se corre una tarea, entonces respeta `dependsOn: ["^build"]`.
- **example:** `pnpm --filter @bow-sight/domain test` corre solo los tests del dominio.
- **story-points:** 3
- **depends_on:** —
- **risk:** low
- **test_plan:** El propio `pnpm install` y `pnpm typecheck` en verde.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [x] F0-02 · Tooling: Prettier, ESLint, husky, commitlint

- **module:** infra
- **description:** Las reglas que se aplican solas. ESLint con las cuatro reglas arquitectonicas del
  proyecto, Prettier con `printWidth: 100`, husky con lint-staged y commitlint con el vocabulario de
  modulos de la spec.
- **acceptance-criteria:**
  - Dado un import de `mongoose` dentro de `packages/domain`, cuando corre el lint, entonces falla
    con el mensaje que cita ADR-001.
  - Dado un import entre modulos de la API, cuando corre el lint, entonces falla citando ADR-002.
  - Dado un `new Date()` fuera de un test, cuando corre el lint, entonces falla.
  - Dado un commit con un scope fuera de la lista, cuando se commitea, entonces commitlint lo rechaza.
- **example:** Alguien escribe `import { Types } from 'mongoose'` en `sightMarks.ts` y el lint no lo
  deja: el dominio es puro y eso no se negocia con buena voluntad.
- **story-points:** 3
- **depends_on:** F0-01
- **risk:** low
- **test_plan:** `pnpm lint` en verde sobre el repo, y un caso deliberado de cada regla verificado a
  mano.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [x] F0-03 · La spec

- **module:** docs
- **description:** `docs/spec/BOW-SIGHT-SPEC.md`, escrita desde la investigacion de mercado. Es la
  fuente de verdad: si algo queda fuera de spec, primero se actualiza la spec.
- **acceptance-criteria:**
  - Dada la spec, cuando alguien busca un plan, un limite o un estado, entonces lo encuentra con su
    numero de seccion.
  - Dada la spec, cuando se compara contra la competencia, entonces cada afirmacion es verificable.
  - Dado el Definition of Done, cuando se lee, entonces es el mismo texto que el del PR template.
- **example:** Alguien pregunta cuantas miras entran en Free. La respuesta esta en §5.3 y es 1.
- **story-points:** 8
- **depends_on:** —
- **risk:** med
- **test_plan:** Revision cruzada contra los ADRs. `pnpm docs:links` sin enlaces rotos.
- **error-codes:** ninguno
- **data-model-impact:** define el modelo completo (§5.4)

## [x] F0-04 · Los siete ADRs iniciales

- **module:** docs
- **description:** Las decisiones que no se re-discuten: dueño de los datos, modelo empirico,
  monorepo, cobro, renderizado de la landing, i18n y escritura offline.
- **acceptance-criteria:**
  - Dado cada ADR, cuando se lee, entonces tiene contexto, al menos dos opciones reales con su costo,
    la decision y las consecuencias buenas **y malas**.
  - Dado `CLAUDE.md`, cuando se lee la seccion de decisiones tomadas, entonces lista los siete.
- **example:** Alguien propone guardar las marcas ya convertidas a pulgadas. ADR-001 y la regla 6 de
  `CLAUDE.md` cierran la discusion sin tener que re-argumentarla.
- **story-points:** 5
- **depends_on:** F0-03
- **risk:** low
- **test_plan:** `pnpm docs:links`. Revision con `spec-reviewer`.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [x] F0-05 · Los documentos de contexto

- **module:** docs
- **description:** `ARQUITECTURA`, `TECNICO`, `FUNCIONAL`, `errors`, `runbook-staging`, `docs/apps/*`
  y `docs/domain/SIGHT-MATH.md`.
- **acceptance-criteria:**
  - Dado `TECNICO.md`, cuando alguien que nunca vio el repo lo sigue, entonces lo tiene corriendo sin
    preguntar nada.
  - Dado `errors.md`, cuando se agrega un codigo, entonces el correlativo de su modulo nunca se
    reutiliza.
  - Dado `SIGHT-MATH.md`, cuando se lee, entonces explica por que PCHIP y no balistica, con el modo
    de falla concreto de la alternativa.
- **example:** Un colaborador nuevo clona el repo un domingo y a los quince minutos tiene las tres
  apps levantadas y los tests en verde.
- **story-points:** 8
- **depends_on:** F0-03, F0-04
- **risk:** low
- **test_plan:** `pnpm docs:links`.
- **error-codes:** 43 codigos declarados en `docs/errors.md`
- **data-model-impact:** ninguno

## [x] F0-06 · CLAUDE.md raiz y por app

- **module:** docs
- **description:** El contrato de convenciones para las sesiones de IA. Uno en la raiz con las diez
  reglas no negociables, y uno por app con lo especifico.
- **acceptance-criteria:**
  - Dado el `CLAUDE.md` raiz, cuando se lee, entonces lista stack, estructura, comandos, reglas,
    prohibiciones, DoD y decisiones cerradas.
  - Dado cada app, cuando tiene su `CLAUDE.md`, entonces dice su puerto, su alcance y sus
    particularidades.
- **example:** Una sesion nueva de Claude Code arranca sabiendo que el `userId` sale de la sesion sin
  que nadie se lo diga.
- **story-points:** 3
- **depends_on:** F0-04
- **risk:** low
- **test_plan:** Revision a mano.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** hechos los cuatro: raiz, `api`, `pwa` y `landing`.

## [x] F0-07 · `.claude/`: agentes, comandos y hooks

- **module:** infra
- **description:** Cuatro subagentes con roles cerrados (`spec-reviewer`, `security-reviewer`,
  `test-writer`, `domain-reviewer`), cinco comandos (`/adr`, `/bitacora`, `/new-module`,
  `/new-task`, `/trello-sync`) y dos hooks: uno que bloquea secretos antes de escribir y otro que
  formatea despues.
- **acceptance-criteria:**
  - Dado un intento de escribir una clave secreta, cuando dispara el hook, entonces bloquea con
    salida 2 y explica que los secretos van a Railway.
  - Dado un placeholder de `.env.example`, cuando dispara el hook, entonces **no** bloquea.
  - Dado `settings.json`, cuando se escribe en `docs/spec/**` o en `packages/domain/src/**`,
    entonces pide confirmacion.
- **example:** Alguien pega por error un `sk_live_...` en un archivo y el hook lo frena antes de que
  toque el disco.
- **story-points:** 5
- **depends_on:** F0-04
- **risk:** low
- **test_plan:** Probar el hook con un secreto real de juguete y con un placeholder.
- **error-codes:** ninguno
- **data-model-impact:** ninguno

## [~] F0-08 · El tablero de Trello

- **module:** infra
- **description:** Armar el tablero con las cinco listas y las siete etiquetas, y cargar el backlog
  de la Fase 0 y las epicas de las fases siguientes.
- **acceptance-criteria:**
  - Dado el tablero, cuando se abre, entonces tiene las listas `Sin iniciar`, `En proceso`,
    `Completadas`, `Canceladas` y `Bloqueadas`.
  - Dadas las etiquetas, cuando se filtran, entonces existen `SPEC`, `TECNICO`, `API`, `PWA`,
    `LANDING` y `BUG`.
  - Dada cada tarjeta, cuando se abre, entonces sigue el formato: fase, puntos, riesgo, alcance,
    tests no negociables y el enlace al detalle en `ACTION-PLAN.md`.
  - Dado `ACTION-PLAN.md`, cuando difiere del tablero en el **contenido**, entonces gana el plan; si
    difiere en el **estado**, gana el tablero.
- **example:** Se termina F0-09 y la tarjeta se mueve a `Completadas` con la entrada de bitacora
  enlazada.
- **story-points:** 3
- **depends_on:** F0-03
- **risk:** low
- **test_plan:** Verificacion a mano contra el tablero.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** las cinco listas estan, el backlog completo esta cargado, y **las 21 tarjetas de F0 ya
  tienen su etiqueta puesta**, por color.
  - 🔴 **Falta lo unico que solo puede hacer una persona:** el MCP de Trello **no puede crear ni
    renombrar etiquetas** (`trelloWriteBoard` solo crea tableros). Las seis por defecto estan
    asignadas pero **sin nombre**. Hay que nombrarlas a mano respetando el mapeo, porque las
    tarjetas ya estan pintadas con el: azul→`SPEC`, violeta→`TECNICO`, verde→`API`, amarillo→`PWA`,
    naranja→`LANDING`, rojo→`BUG`.
  - Son **seis y no siete**: Trello da seis colores por defecto, y `PRODUCTO` obligaria a crear una
    etiqueta nueva a mano igual. Las tarjetas que hubieran sido `PRODUCTO` quedaron como `TECNICO`.
  - Queda en `[~]` y en `En proceso` a proposito: el tablero manda en el estado, y con las etiquetas
    sin nombre el criterio de aceptacion no se cumple.

## [x] F0-09 · `@bow-sight/domain`: portar PCHIP y la regla

- **module:** domain
- **description:** Portar `sightMarks.ts` y `ruler.ts` desde `bv-bow-sight` **con sus tests
  originales sin modificar**, y ponerlos bajo el gate de cobertura del 95%. Es el activo tecnico del
  producto: es lo primero que se mueve y lo que no se puede romper.
- **acceptance-criteria:**
  - Dados los tests portados, cuando se corren, entonces pasan **sin haber cambiado una linea**.
  - Dado el gate de cobertura, cuando corre, entonces supera 95% de lineas y 90% de ramas.
  - Dado un import de framework o de Node dentro del paquete, cuando corre el lint, entonces falla.
  - Dado `markAt(d)` para toda marca medida, cuando se evalua, entonces devuelve **exactamente** esa
    marca.
- **example:** Se carga 20 m → 0.4, 30 m → 1.2, 40 m → 2.1, 50 m → 3.2 y 60 m → 4.5. `markAt(30)`
  devuelve 1.2, ni 1.19 ni 1.21.
- **story-points:** 5
- **depends_on:** F0-01, F0-02
- **risk:** high
- **test_plan:** Los 30 tests portados, mas los casos borde de las condiciones de error, la guarda de
  densidad de la regla y los datos sucios (distancias repetidas, marcas no monotonas).
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - Los tests se **colocaron** junto al codigo (`src/*.test.ts`) en vez de en `tests/`. Es lo unico
    que cambio de ellos: la ruta del import. Colocarlos es la convencion del monorepo y hace obvio
    que un archivo sin test al lado es un archivo sin cubrir.
  - Los casos borde nuevos van en archivos aparte (`*.edges.test.ts`) para que los portados queden
    literalmente intactos y se pueda verificar de un vistazo que nadie los aflojo.
  - `LIMITS` y `ERROR_CODES`, que venian en el mismo `constants.ts`, **no se portaron**: son
    validacion y errores, y su lugar es `@bow-sight/schemas` y `docs/errors.md`. El dominio se queda
    solo con las constantes que usa la matematica.
  - Resultado: 49 tests, 100% de lineas, 94.8% de ramas. Las ramas que quedan sin cubrir son la
    guarda defensiva de indice fuera de rango y una rama muerta documentada en `SIGHT-MATH.md` §8.

## [x] F0-10 · `@bow-sight/schemas`, `types` y `config`

- **module:** schemas
- **description:** Los tipos y las maquinas de estado en `types`, los schemas Zod compartidos
  front/back en `schemas`, y los tsconfig y eslint compartidos en `config`.
- **acceptance-criteria:**
  - Dado un schema, cuando lo usan la API y el front, entonces es **el mismo objeto**, no una copia.
  - Dados los mensajes de validacion, cuando fallan, entonces son **claves**, no texto (ADR-005).
  - Dados los tipos, cuando se necesitan, entonces salen de `z.infer`, no se escriben a mano.
- **example:** La regla de que una distancia esta entre 0 y 300 m se escribe una vez y la aplican el
  formulario y el endpoint.
- **story-points:** 5
- **depends_on:** F0-01
- **risk:** low
- **test_plan:** Tests que aceptan validos y rechazan invalidos, con la clave exacta esperada.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** cerrada con F0-15. `schemas` tiene sus 19 tests, con la clave de error exacta.

## [x] F0-11 · `@bow-sight/ui`: tokens, tema y primitivas

- **module:** ui
- **description:** Las primitivas accesibles con tokens, tema claro y oscuro, y los componentes que
  comparten la PWA y la landing.
- **acceptance-criteria:**
  - Dada cada primitiva, cuando se navega con teclado, entonces el foco es visible y el orden es el
    esperado.
  - Dado el contraste, cuando se mide, entonces cumple AA en los dos temas.
  - Dado el tema, cuando el sistema esta en oscuro, entonces la app arranca en oscuro sin parpadeo.
- **example:** El boton de "Nueva marca" se ve igual en la PWA y en la demo de la landing porque es
  el mismo componente.
- **story-points:** 8
- **depends_on:** F0-01
- **risk:** med
- **test_plan:** Testing Library + `vitest-axe` por primitiva. Test de contraste de la paleta.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - La paleta es **OKLCH**: es perceptualmente uniforme, asi que bajar la luminosidad da el mismo
    salto visual en cualquier tono. Con hex habria que ajustar cada color a ojo.
  - Los tokens crudos (`--bs-*`) cambian con el tema y `@theme inline` los expone como utilidades.
    Es lo que permite que `bg-surface-1` sea correcto en claro y en oscuro sin duplicar clases.
  - `system` **no escribe** `data-theme`: deja que mande la media query del CSS. Escribir el
    atributo en los tres casos obligaria a sincronizar a mano el cambio de tema del sistema.
  - **El test de `axe` no cubre contraste.** La regla `color-contrast` necesita canvas y jsdom no lo
    tiene, asi que la saltea **en silencio**: quedarse con "pasa axe" daria una sensacion de
    cobertura que no existe. Por eso hay un `contrast.test.ts` que convierte OKLCH a sRGB, calcula
    la luminancia relativa de WCAG y verifica los pares en los dos temas. **Encontro dos fallas
    reales** y se corrigieron los tokens, no el test: `ink-muted` estaba en 3.95:1 sobre blanco
    (el hint de un campo es texto chico y no puede pedir menos que AA) y `border-strong` en 2.0:1.
  - Los tres controles usan `border-strong` y no `subtle`: WCAG 1.4.11 pide 3:1 para el limite de un
    componente. Si no se ve donde empieza el campo, no es decoracion.
  - `SegmentedControl` se implementa con **radios nativos**, no con botones: asi las flechas del
    teclado se mueven entre opciones y el lector de pantalla anuncia "1 de 3" sin escribir manejo
    de foco. Se le pone `min-w-0` porque los `fieldset` traen un `min-inline-size` del navegador que
    les impide encogerse, y una botonera larga desborda en mobile.
  - `Field` usa **render prop**. Cablear `aria-describedby` y `aria-invalid` a mano en cada
    formulario es justo lo que siempre se olvida, y el olvido no se ve: la pantalla queda igual y el
    lector de pantalla no dice nada.
  - Resultado: 44 tests, **100% de lineas**, sobre un gate de 50% para UI generica.

## [x] F0-12 · `apps/api`: Hono, envelope, logger y healthchecks

- **module:** api
- **description:** El esqueleto del backend: Hono con `/api/v1`, el envelope de error de la spec
  §5.0, Pino con el formato de §10.1, `requestId` por pedido, y `/health` y `/ready`.
- **acceptance-criteria:**
  - Dado un throw en cualquier handler, cuando sube, entonces el handler global lo convierte al
    envelope con `code`, `messageKey`, `params`, `requestId` y `timestamp`.
  - Dado el envelope, cuando se inspecciona, entonces **no contiene prosa** en ningun idioma.
  - Dado `/ready`, cuando Mongo esta caido, entonces responde 503 aunque el proceso viva.
  - Dado cualquier log, cuando se emite, entonces lleva `requestId` y nunca un token.
- **example:** Un 500 inesperado llega al cliente como `BS-SYS-500-005` con su `requestId`, y ese
  mismo `requestId` esta en el log.
- **story-points:** 5
- **depends_on:** F0-01, F0-10
- **risk:** med
- **test_plan:** Integracion: un handler que lanza, uno que valida mal, `/health` y `/ready` con y
  sin Mongo.
- **error-codes:** `BS-SYS-400-001`, `BS-SYS-404-002`, `BS-SYS-429-004`, `BS-SYS-500-005`,
  `BS-SYS-503-006`
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - `createApp(deps)` **recibe** `env`, `logger`, `now` e `isDatabaseReady` en vez de construirlos.
    Es lo que permite probar toda la app sin levantar Mongo ni leer el entorno, y lo que hace que el
    `timestamp` del envelope sea verificable: en los tests el reloj esta fijo.
  - `env.schema.ts` esta **separado** de `env.ts`. El cargador termina el proceso cuando falta una
    variable, y eso mataria a cualquier herramienta que solo quiera el schema: un script de
    migracion, un test, el generador de OpenAPI.
  - El error de configuracion **lista todas** las variables que faltan, no la primera. Si no,
    arreglar un deploy son cinco vueltas en vez de una.
  - 🔴 **El build pasa de `tsc` a `tsup`.** Se descubrio corriendo el binario, no leyendolo:
    `node dist/index.js` moria con `ERR_MODULE_NOT_FOUND` porque los paquetes `@bow-sight/*`
    publican **TypeScript crudo** (`main` apunta a `src/index.ts`). Eso anda bajo `tsx` y bajo
    Vitest, que transpilan al vuelo, y falla en produccion. `tsup` inlinea el workspace en un solo
    archivo; la alternativa —darle build a cada paquete compartido— son seis builds mas y un orden
    de compilacion que mantener.
  - El logger acepta un destino inyectable. No es un adorno de testeabilidad: es lo que permite
    **verificar la redaccion**, que es una garantia de seguridad y no una intencion.
  - `/ready` responde 503 tambien cuando el chequeo **explota**, no solo cuando devuelve `false`.
    Un healthcheck que se cae con un stack no le sirve a la plataforma: tiene que decir "no estoy
    listo", no "algo salio mal".

## [x] F0-13 · MongoDB con replica set, migraciones e indices

- **module:** api
- **description:** Conexion a Atlas con replica set, `migrate-mongo` con la migracion inicial de
  indices, y el arnes de tests con `mongodb-memory-server` en modo replica set.
- **acceptance-criteria:**
  - Dado el arranque, cuando falta `MONGODB_URI`, entonces la API no levanta y dice cual falta.
  - Dadas las migraciones, cuando se corren dos veces, entonces la segunda no hace nada y no rompe.
  - Dado un indice compuesto, cuando se inspecciona, entonces `userId` va **primero**.
  - Dados los tests, cuando se corren, entonces levantan su replica set en memoria y las
    transacciones funcionan.
- **example:** `pnpm exec migrate-mongo up` crea el unico parcial de `mark` sobre las no borradas.
- **story-points:** 5
- **depends_on:** F0-12
- **risk:** high
- **test_plan:** Test de que una transaccion que falla a mitad no deja nada escrito.
- **error-codes:** ninguno
- **data-model-impact:** todas las colecciones de la spec §5.4.2 y sus indices de §5.4.3
- **decisiones de diseño:**
  - **El soporte de transacciones se verifica al arrancar**, no cuando falla el primer cobro. En
    `staging` y `prod`, un cluster que no es replica set **corta el proceso**: es preferible que el
    deploy no levante a que levante y pierda una suscripcion a la mitad.
  - `/ready` hace un **ping real**, no mira `readyState`. El `readyState` dice que el driver _cree_
    estar conectado, no que la base conteste.
  - `bufferCommands: false`. Con el buffer activado, un query contra una base caida queda esperando
    para siempre y el pedido se cuelga sin respuesta; asi falla rapido y el error sube tipado.
  - Los unicos de `mark`, `bowSetup` y `arrowSet` son **parciales sobre las filas vivas**. Sin eso,
    borrar una marca dejaria su distancia reservada para siempre y el arquero no podria recargarla.
  - El unico de `email` usa **collation de fuerza 2**: `Braian@x.com` y `braian@x.com` son la misma
    persona y no pueden tener dos cuentas.
  - El unico de `billingEvent` **es** el store de idempotencia de los webhooks: el mismo evento tres
    veces produce un solo efecto porque el segundo choca contra el indice, sin logica extra.
  - Sin `MONGODB_URI`, la API levanta igual y `/ready` responde 503. Es para poder probar el arranque
    en dev sin depender de nada; en un ambiente desplegado la variable es obligatoria y `loadEnv`
    corta antes.
  - Resultado: 47 tests, 99% de lineas. El de la transaccion que revierte es el que prueba que el
    replica set esta de verdad.

## [x] F0-14 · Better Auth: email, verificacion y reset

- **module:** auth
- **description:** Identidad con email y contraseña. Verificacion de email obligatoria antes de
  cobrar, reset por email, y sesion que sobrevive a un reinicio porque vive en Mongo.
- **acceptance-criteria:**
  - Dado un email sin registrar, cuando alguien se registra, entonces se crea la cuenta, se manda el
    mail de verificacion y queda sin verificar.
  - Dadas credenciales incorrectas, cuando intenta entrar, entonces responde `BS-AUTH-401-001` sin
    revelar si el email existe.
  - Dado un email ya registrado, cuando se registra de nuevo, entonces responde `BS-AUTH-409-004`.
  - Dado un reset exitoso, cuando se completa, entonces **todas** las sesiones anteriores se
    invalidan.
  - Dada la cookie de sesion, cuando se inspecciona, entonces es `httpOnly`, `Secure` y
    **`SameSite=Lax`** (ADR-003).
  - Dado el mail, cuando se envia, entonces esta en el idioma del usuario, no en el del request.
- **example:** Braian se registra, recibe el mail en español, hace clic y queda verificado. Su sesion
  sobrevive a un redeploy.
- **story-points:** 8
- **depends_on:** F0-13
- **risk:** high
- **test_plan:** Integracion de registro, login, sesion, verificacion, reset y cada codigo de error.
  Ningun test toca la red: el envio de mail se inyecta como puerto.
- **error-codes:** `BS-AUTH-401-001`, `BS-AUTH-401-002`, `BS-AUTH-403-003`, `BS-AUTH-409-004`,
  `BS-AUTH-429-005`, `BS-AUTH-400-006`, `BS-AUTH-400-007`
- **data-model-impact:** colecciones de Better Auth (`user`, `session`, `account`, `verification`)
  mas `locale`, `distanceUnit`, `planCode` y `planValidUntil` en `user`
- **decisiones de diseño:**
  - 🔴 **Las rutas de auth van envueltas, no montadas.** Better Auth trae su handler y su formato de
    error; montarlo tal cual dejaria un unico rincon de la API respondiendo distinto a todo lo demas,
    y el cliente tendria que saber leer dos formas de error. Se llama a su API de servidor y se
    traduce al envelope unico.
  - **La verificacion no bloquea el ingreso**, solo lo que importa (cobrar, compartir con un coach).
    Bloquear la entrada deja al arquero afuera si el mail tarda, y todavia no hay nada que proteger.
  - 🔴 `planCode` es `input: false`. Si fuera de entrada, cualquiera se pondria en `max` desde el
    formulario de registro. Lo escriben los webhooks de cobro, nadie mas.
  - Un email ya registrado responde 409 y una contraseña incorrecta responde 401 **con el mismo
    cuerpo que un email inexistente**. El primero es un conflicto al crear; el segundo no puede
    revelar si la cuenta existe. `mapAuthError` manda todo 401 y todo 404 a `invalidCredentials`,
    incluido lo desconocido: ante la duda, el error menos informativo.
  - Pedir un reset responde **204 siempre**, exista o no el email. Responder distinto convertiria ese
    endpoint en un buscador de cuentas.
  - 🔴 **Bug encontrado al correr el test, no al leer el codigo:** el enlace del mail de verificacion
    apuntaba a la ruta por defecto de Better Auth, que no esta montada — respondia **404 y la cuenta
    no se podia verificar nunca**. Ahora los enlaces apuntan a rutas propias: la verificacion a un
    `GET /api/v1/auth/verify-email` que verifica y **redirige a la PWA**, y el reset directo a la
    pantalla de la PWA. El arquero llega desde su cliente de correo: tiene que terminar en una
    pantalla, no en un JSON. Quedo su test de regresion.
  - El mail se manda por un **puerto** (`Mailer`), con implementacion en memoria para los tests, de
    consola para dev y Resend por `fetch` para produccion — sin una dependencia mas. Ningun test toca
    la red. En un ambiente desplegado, `RESEND_API_KEY` es obligatoria: sin ella los mails irian al
    log, y eso es escribir un token de un solo uso en los logs.
  - Resultado: 99 tests en la API, 95% de lineas.

## [x] F0-15 · Modelo de datos con aislamiento por usuario

- **module:** api
- **description:** Los modulos `equipment`, `sights` y `marks`: modelo de Mongoose, repositorio que
  inyecta el `userId`, casos de uso y rutas. Mas los schemas Zod que faltan de F0-10.
- **acceptance-criteria:**
  - Dado un controller, cuando intenta usar el modelo de Mongoose directo, entonces el lint lo
    bloquea.
  - Dada una consulta sin contexto de usuario, cuando llega al plugin de Mongoose, entonces falla en
    vez de devolver datos de todos.
  - Dado el recurso de otro arquero, cuando se lo pide, entonces responde **404**, nunca 403.
  - Dada una marca fuera de la escala de su mira, cuando se crea, entonces responde
    `BS-MARK-409-002` con el rango en `params`.
  - Dado un set de flechas con marcas, cuando se lo borra, entonces responde `BS-EQUIP-409-002`.
  - Dado un rango de escala nuevo que dejaria marcas afuera, cuando se guarda, entonces responde
    `BS-SIGHT-409-003` diciendo cuantas.
- **example:** El arquero A pide `/api/v1/sights/<id-de-B>` y recibe 404, no 403: un 403 le
  confirmaria que esa mira existe.
- **story-points:** 8
- **depends_on:** F0-14
- **risk:** high
- **test_plan:** CRUD completo de los tres modulos, todas las validaciones cruzadas, y el borrado en
  cascada de las marcas al borrar una mira.
- **error-codes:** los de `EQUIP`, `SIGHT` y `MARK` declarados en `docs/errors.md`
- **data-model-impact:** `bowSetup`, `arrowSet`, `sight`, `mark`
- **decisiones de diseño:**
  - Las **tres capas** de ADR-000, completas: el repositorio inyecta el `userId`; un plugin de
    Mongoose hace **fallar** cualquier consulta que llegue sin el —con un `bypassOwnership()`
    explicito para lo que legitimamente cruza usuarios—; y la suite parametrizada ataca cada ruta.
  - Los modulos **no se importan entre si**. Cada uno declara sus puertos y el punto de composicion
    los conecta con **resolucion tardia**: los ciclos (`equipment` necesita a `marks` y viceversa)
    se rompen porque el puerto lee la referencia recien cuando alguien lo llama.
  - Borrar una mira arrastra sus marcas en **soft**. Son meses de campo: el dia que alguien pida
    recuperar una mira borrada por error, van a estar.
  - 🔴 **Dos bugs que aparecieron al correr los tests, no al leerlos.**

    **Uno:** los modelos escribian en `marks` y la migracion indexaba `mark` — Mongoose pluraliza
    por defecto. **Todos los unicos estaban sobre colecciones que nadie usaba**, incluido el que
    sostiene la idempotencia de los webhooks de cobro. No se habria notado hasta el primer duplicado
    en produccion. Ahora el nombre se fija a mano y hay un test que compara los modelos montados
    contra lo que indexan las migraciones.

    **Dos:** `GET /sights/:id/marks` devolvia `200 []` para una mira borrada o ajena, en vez de 404.
    No filtraba datos, pero rompia la regla de que lo que no es tuyo no existe — y una
    inconsistencia asi es de donde salen las fugas. Ahora verifica la mira antes de filtrar.

  - `persistence/clock.ts` es **el unico lugar del proyecto donde se permite `new Date()`**, con su
    `eslint-disable` y su motivo: el driver de Mongo persiste `Date`, asi que en algun punto hay que
    construir uno. En una funcion de tres lineas, no repartido por los servicios.
  - Resultado: 153 tests en la API, 93% de lineas. El que mas importa: **la calculadora devuelve
    exactamente la marca que el arquero cargo**, verificado por HTTP en las cinco distancias.

## [x] F0-16 · Suite parametrizada de aislamiento

- **module:** api
- **description:** El registro de rutas con su fixture de ataque por endpoint, y la suite que lo
  recorre atacando cada ruta desde otro usuario. Sin esto, agregar un endpoint y olvidarse del test
  es cuestion de tiempo.
- **acceptance-criteria:**
  - Dada una ruta nueva sin fixture de ataque, cuando compila la suite, entonces **el CI falla**.
  - Dada cada ruta del registro, cuando se la ataca desde otro usuario, entonces responde 404 o 403,
    nunca el recurso.
  - Dado el registro, cuando se genera el OpenAPI, entonces sale del mismo registro y no de un
    archivo aparte.
- **example:** Se agrega `PATCH /api/v1/marks/:id`, se olvida el fixture, y el build no compila. No
  hay forma de que llegue a produccion sin su test.
- **story-points:** 5
- **depends_on:** F0-15
- **risk:** high
- **test_plan:** La suite misma. Mas un test que verifica que una ruta sin fixture rompe.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - El cruce se hace contra `app.routes` de Hono: la lista de rutas **montadas**, no una declarada a
    mano que se desactualizaria sola.
  - El test lleva su propia guarda contra ser **vacuo**: si la lista de rutas viniera vacia, pasaria
    siempre sin comparar nada, que es peor que no tenerlo.
  - Los listados son la excepcion prevista: responden 200 pero **vacios**, con lo del atacante. El
    test lo contempla y verifica que ningun id de la victima aparezca.
  - Y despues de los veinte ataques, un test comprueba que **los datos de la victima siguen
    intactos**: que ninguno haya entregado nada no alcanza si alguno escribio.

- **estado del OpenAPI:** la tarjeta planteaba que el contrato saliera del mismo registro de rutas, y
  eso **quedo sin hacer** cuando se cerro. Se construyo despues, en `apps/api/src/openapi/`:
  - La lista de rutas sale de `app.routes` —la app montada de verdad—, la descripcion de cada una de
    un catalogo declarativo, y los cuerpos de los mismos schemas de Zod que validan en runtime, via
    `z.toJSONSchema`. Nunca hay una segunda copia de una regla.
  - 🔴 Una ruta montada sin entrada en el catalogo **hace fallar `createApp`**. Es el gemelo del
    fixture de ataque: la documentacion no puede desactualizarse porque el proceso no arranca cuando
    lo esta. El test verifica tambien lo contrario —documentar algo que no existe manda a un
    integrador contra un 404— y que todo codigo citado este declarado en `docs/errors.md`.
  - 🔴 Se sirve **JSON y nada mas**. Un visor de OpenAPI se monta cargando un script de un CDN, y
    ese script correria en el **mismo origen que la cookie de sesion**.

## [x] F0-17 · `apps/pwa`: esqueleto instalable

- **module:** pwa
- **description:** React 19 + Vite + TanStack Router y Query, el tema de `@bow-sight/ui`, el cliente
  de `@bow-sight/client`, y el service worker que la hace instalable y legible sin red.
- **acceptance-criteria:**
  - Dada la app, cuando se abre en un telefono, entonces se puede instalar desde el navegador.
  - Dada la app instalada, cuando se abre sin red, entonces muestra los datos cacheados y avisa que
    esta sin conexion.
  - Dado el tema, cuando el sistema esta en oscuro, entonces arranca en oscuro sin parpadeo.
  - Dada una version nueva, cuando se despliega, entonces la app ofrece actualizar sin reinstalar.
- **example:** El arquero agrega la app a su pantalla de inicio y al dia siguiente, en el campo sin
  señal, abre y ve sus miras.
- **story-points:** 5
- **depends_on:** F0-11, F0-12
- **risk:** med
- **test_plan:** Testing Library sobre el shell. Verificacion a mano de la instalacion en Android e
  iOS.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - 🔴 El service worker usa `registerType: 'prompt'`, **no `autoUpdate`**. Recargar sola mientras
    el arquero anota una marca entre dos tandas le hace perder lo que estaba escribiendo, y en el
    campo de tiro no hay forma de recuperarlo.
  - `/email-verificado` y `/restablecer` son **publicas a proposito**: se llega desde un mail, y
    quien lo abre en otro dispositivo no tiene sesion. Mostrarle un login seria un callejon.
  - Un elemento que **navega** es un `<a>`, no un `<button>` con `onClick`. `buttonClasses()`
    comparte el estilo sin robarle el rol: asi siguen funcionando "abrir en otra pestaña", el menu
    contextual y el anuncio del lector de pantalla. Vive en su propio archivo porque la regla de
    fast refresh tiene razon: mezclarlo con el componente rompe el hot reload.
  - `app/errorText.ts` es un **puente declarado**, no una solucion: traduce las claves que manda la
    API a texto en español hasta que entre i18next en F1-A. Esta escrito para que su reemplazo sea
    cambiar el cuerpo por `t()` y mudar el mapa a los catalogos.
  - Los iconos se generan con un PNG escrito a mano en un script de veinte lineas: tres iconos no
    justifican una dependencia de imagenes.
  - El anti-FOUC del tema va **inline en el `index.html`**, antes del primer pintado. Arrancar en
    claro y saltar a oscuro, al sol, es un fogonazo.

## [x] F0-18 · `apps/landing`: prerender y demo de la regla

- **module:** landing
- **description:** `vite-react-ssg` con las rutas por idioma, el `sitemap.xml` y el `robots.txt`
  generados en el build, y **la demo interactiva de la regla** corriendo en el cliente con
  `@bow-sight/domain`.
- **acceptance-criteria:**
  - Dado el build, cuando se inspecciona el HTML de una ruta, entonces contiene el `<title>`, la meta
    description y el contenido **sin ejecutar JavaScript**.
  - Dado el build, cuando termina, entonces emite `sitemap.xml` y `robots.txt`.
  - Dada la demo, cuando se cargan marcas de ejemplo, entonces la curva pasa exacto por cada una y se
    ve la diferencia contra una regresion.
  - Dadas las rutas por idioma, cuando se inspeccionan, entonces llevan `hreflang`.
- **example:** Un arquero de Texas busca "sight tape calculator", entra, mueve la regla, ve que la
  curva toca cada marca, y se registra.
- **story-points:** 8
- **depends_on:** F0-09, F0-11
- **risk:** med
- **test_plan:** Aserciones sobre el HTML **prerenderizado**, no sobre el arbol de React. Por eso el
  build va antes de los tests en el CI.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- 🔴 **estado: cerrada con un criterio pendiente, declarado.** Los tres primeros criterios estan
  verificados por `src/ssg.test.ts`, que lee `dist/`. El cuarto —`hreflang` en las rutas por
  idioma— **no se cumple y no se va a cumplir aca**: las rutas EN no existen hasta F1-A, y un
  `hreflang` que apunta a una URL que devuelve 404 es peor que su ausencia — Google lo marca como
  error en Search Console y descarta el grupo entero. Se movio a F1-A, que es donde nacen esas
  rutas.
- **decisiones de diseño:**
  - 🔴 `@bow-sight/landing#test` **depende de su propio `build`** en `turbo.json`, no solo del de
    sus dependencias. Sus aserciones leen `dist/`: sin esa arista, en un checkout limpio los tests
    fallarian, y si en vez de fallar se saltearan, el SSG quedaria sin cubrir sin que nadie se
    entere. La razon vive en `apps/landing/CLAUDE.md` porque turbo rechaza claves de comentario.
  - Los metadatos de cada pagina son **datos**, en `src/seo.ts`. De esa tabla salen el `<title>`, la
    description, el Open Graph, el canonical, el `sitemap.xml` y el `robots.txt`: una pagina nueva
    no puede quedar fuera del sitemap por olvido.
  - Las legales quedan **fuera del sitemap** (`inSitemap: false`): no aportan y diluyen.
  - El `index.html` **no lleva `<title>` estatico**. Con uno, el HTML prerenderizado salia con dos
    titles —el estatico y el de `<Head>`—, que son dos señales distintas para el crawler. Hay un
    test que cuenta que haya exactamente uno.
  - La demo corre `@bow-sight/domain` **en el cliente y sin API**, y se prerenderiza entera: el SVG
    de la regla, sus ticks y sus seis marcas estan en el HTML antes de que cargue un kilobyte de
    JavaScript. A 30 m muestra `12.0`, exactamente la marca medida — la promesa del producto,
    verificada por un test sobre el HTML que ve un visitante.
  - La comparacion contra la competencia habla de **enfoque tecnico**, no de calidad: que hace cada
    app, sin adjetivos, sin precios ajenos que envejecen y sin testimonios inventados.

## [x] F0-19 · CI en GitHub Actions

- **module:** ci
- **description:** El pipeline: formato, enlaces de la documentacion, lint, typecheck, **build**,
  tests con gate de cobertura, e2e y auditoria de dependencias.
- **acceptance-criteria:**
  - Dado un PR, cuando corre el CI, entonces ejecuta en ese orden y falla en el primer paso que no
    pase.
  - Dado el build, cuando corre, entonces va **antes** de los tests: los de la landing verifican el
    HTML prerenderizado, que solo existe despues de buildear.
  - Dado el gate de cobertura, cuando el dominio baja del 95%, entonces el CI falla.
  - Dado un enlace roto en `docs/`, cuando corre `pnpm docs:links`, entonces el CI falla.
- **example:** Alguien afloja un test del dominio para que pase y el gate de ramas lo delata.
- **story-points:** 5
- **depends_on:** F0-09, F0-17, F0-18
- **risk:** low
- **test_plan:** El propio CI en verde sobre un PR de prueba.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - El pipeline no se escribio en esta tarjeta —ya existia de F0-02—: lo que se hizo fue **correrlo
    entero, paso por paso**, y arreglar lo que no era cierto. Un workflow que nadie ejecuto es una
    intencion, no un CI.
  - 🔴 `deploy-staging` queda **apagado** detras de la variable de repositorio `DEPLOY_STAGING`.
    Sin el proyecto de Railway (F0-20) fallaba en cada push a `main`, y un CI en rojo permanente
    entrena a todos a ignorarlo.
  - La cobertura de la landing mide **solo `src/seo.ts`**, con el gate en 95%. Sus componentes se
    ejecutan en el `build`, no en el test, y v8 no puede atribuir esa ejecucion: medirlos daba 20%,
    que no significa "sin probar" sino "medido en el lugar equivocado".
  - El gate de la PWA subio de 50% a 90/75 despues de escribir los tests que faltaban. Un gate 40
    puntos por debajo de la realidad deja bajar la cobertura sin que nadie lo note.
- **lo que aparecio al correrlo:**
  - `pnpm test:coverage` estaba **en rojo**: la PWA cubria 29,9% contra un gate de 50%.
  - `turbo.json` hacia depender `test` y `test:coverage` de `^build` (el de las dependencias), no
    del propio: en un checkout limpio los tests de la landing fallaban.
  - 🔴 **`vite-react-ssg dev` ignora `--port`.** La landing nunca escuchaba en el 5176, asi que el
    job de E2E esperaba 120 segundos y moria por timeout. Los tres puertos quedaron fijos con
    `strictPort`.
  - Cinco claves de error que la API puede devolver hoy **no tenian texto en la PWA**: el arquero
    veia el codigo pelado. Ahora un test las lee del codigo de la API y falla si falta alguna.

## [ ] F0-20 · Railway: staging y produccion

- **module:** infra
- **description:** Tres servicios por ambiente con su `railway.json`, las variables cargadas, el
  cluster de Atlas con replica set y PITR, y el restore de verificacion corrido y anotado.
- **acceptance-criteria:**
  - Dado un push a `main` con el CI en verde, cuando termina, entonces despliega a staging solo.
  - Dado staging levantado, cuando se consulta `/ready`, entonces responde 200 y verifica Mongo.
  - Dado el cluster, cuando se configura, entonces tiene replica set, backups automaticos y PITR.
  - Dado un backup, cuando se ejecuta el procedimiento de restore, entonces se restaura en un cluster
    aparte, se comparan los conteos y **se anota el resultado en la bitacora**.
  - Dados los secretos, cuando se configuran, entonces viven en Railway, nunca en el repo.
- **example:** Se corre el restore un viernes. La base restaurada tiene los mismos documentos y la
  API levanta contra ella. Recien ahi el backup cuenta como backup.
- **story-points:** 5
- **depends_on:** F0-19
- **risk:** med
- **test_plan:** Smoke E2E contra staging despues de cada deploy. Restore verificado a mano una vez,
  con el resultado anotado.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **estado:** 🔴 **Bloqueada** hasta que existan las cuentas: el proyecto en Railway, el cluster de
  Atlas con replica set (sin el fallan las transacciones de los webhooks) y las claves de Resend,
  Stripe y Mercado Pago.
  - **Hecho lo que no depende de aprovisionar nada:** los tres `railway.json`, con sus comandos de
    arranque **verificados corriendolos** —`node apps/api/dist/index.js` levanta y `/ready` responde
    503 con `database:false` cuando no hay Mongo, que es lo correcto; los dos `preview` sirven el
    build en el puerto que se les pasa—; el job de deploy en el CI, apagado detras de la variable
    `DEPLOY_STAGING`; y el runbook, incluido el procedimiento de importacion de F0-21.
  - **Falta, y solo lo puede hacer el dueño de las cuentas:** crear el proyecto y los tres servicios
    en Railway, el cluster de Atlas con replica set y PITR, cargar las variables, poner
    `DEPLOY_STAGING=true`, y correr el restore de verificacion anotandolo en la bitacora.

## [x] F0-21 · Migrar los datos reales del autor

- **module:** infra
- **description:** El script de una sola vez que lleva las filas de SQLite de `bv-bow-sight` a
  MongoDB: mapea los ids enteros a UUIDv7, convierte la escala de centimetros a milimetros y deja la
  cuenta del autor verificada.
- **acceptance-criteria:**
  - Dado el `.db` original, cuando corre el script, entonces inserta en orden de dependencia dentro
    de una transaccion.
  - Dada la conversion, cuando termina, entonces cada `scale_value` en cm quedo como milimetros
    (`× 10`) y cada mira tiene `scaleUnit: 'cm'`.
  - Dados los conteos, cuando se comparan contra el origen, entonces coinciden tabla por tabla.
  - Dadas las sesiones, cuando se migran, entonces **no se migran**: todos vuelven a entrar.
- **example:** Las siete distancias de la mira del autor aparecen en la PWA nueva con los mismos
  valores, leidas en centimetros.
- **story-points:** 3
- **depends_on:** F0-15
- **risk:** med
- **test_plan:** Correr sobre una **copia** del `.db`. Assert de conteo por coleccion y comparacion
  fila a fila antes de dar por buena la migracion.
- **error-codes:** ninguno
- **data-model-impact:** ninguno
- **decisiones de diseño:**
  - `better-sqlite3` entra como dependencia **de desarrollo** solo para este script, y sale del
    `Dockerfile` de produccion junto con las herramientas de compilacion nativa.
  - 🔴 **No migra usuarios ni sesiones.** El hash de la app vieja es argon2id sobre un alias; Better
    Auth usa su propio esquema sobre un email. Reimplementar esa traduccion seria escribir
    criptografia para un solo usuario. El arquero se crea la cuenta por el camino normal y el script
    mete sus datos abajo de ese `userId` (`--email`), que es lo unico que importa (ADR-000). Deja esa
    cuenta verificada: ya demostro que el email es suyo.
  - `traducir()` es **pura**: filas adentro, documentos afuera. Es lo unico que hace verificable una
    migracion que se corre una sola vez y no se puede repetir.
  - La base vieja es **multiusuario**. Con mas de un usuario y sin `--alias`, el script se planta en
    vez de elegir uno: elegir "por defecto" seria escribir los datos de otra persona abajo de esta
    cuenta.
  - `Math.round(cm * 10)` y no `cm * 10`: en punto flotante `4.1 * 10` da `41.00000000000001`, y esa
    basura termina impresa en la regla.
  - Los nombres de coleccion son los **singulares** de la spec §5.4.2 (`mark`, `sight`, `bowSetup`,
    `arrowSet`), que es donde estan los indices — no los que Mongoose pluralizaria.
- **estado:** el script y sus 27 tests estan hechos y verificados contra un Mongo efimero en replica
  set (transaccion real, conteos, y las cinco marcas llegando en milimetros). **Falta correrlo sobre
  el `.db` del autor**, que depende de que exista el Atlas de F0-20.
- 🔴 **desviacion detectada:** la spec §341 pide **UUIDv7** generado por el cliente; el codigo usa
  `crypto.randomUUID()`, que es **v4**. El script sigue al codigo, no a la spec, para no dejar dos
  formatos de id conviviendo. Se resuelve en F3, que es donde el orden temporal del id importa de
  verdad (cola offline).

---

# Fase 1 — Paridad competitiva

> Lo que hoy nos deja afuera de la comparacion. No arranca hasta que la Fase 0 este desplegada. Se
> detallan con el formato de tarea recien cuando la fase se abre: redactar hoy el detalle de lo que
> se va a construir dentro de tres meses es trabajo que se tira.

## [ ] F1-A · [Epica] i18n ES/EN completo

Catalogos por namespace, claves **tipadas** (una clave inventada es error de compilacion), la API
devolviendo `messageKey` y `params` en vez de prosa, y los mensajes de Zod como claves. `<html lang>`,
formato de fecha y manifest de la PWA siguiendo el idioma activo. El CI compara los juegos de claves
de `es` y `en` y falla si divergen. Excepcion deliberada: los numeros tecnicos no se localizan.
**~13 SP · riesgo medio.** → ADR-005

Hereda de F0-18 el criterio que alli no se pudo cumplir: **`hreflang` reciproco entre las rutas ES y
EN de la landing, mas `x-default`**, y las dos entradas por pagina en el `sitemap.xml`. Se hace aca
porque es aca donde nacen las rutas EN; emitirlo antes habria apuntado a URLs inexistentes.

## [ ] F1-B · [Epica] Unidades: imperial, pulgadas y clicks

`units.ts` en el dominio, preferencia de distancia por usuario (`m` | `yd`) y unidad de escala por
mira (`cm` | `in` | `click`) con su tamaño de click. La grilla de ticks de la regla se generaliza
para expresar dieciseisavos de pulgada sin acumular float. Conversion **solo en el borde**: canonico
metros y milimetros adentro. **Test: ida y vuelta sin perdida en los dos sistemas y las tres
escalas.** ~13 SP · riesgo medio.

## [ ] F1-C · [Epica] Tape PDF a escala real con calibracion

Generacion en el cliente con `pdf-lib`, milimetros a puntos con factor `72/25.4`, y una **barra de
calibracion de 100 mm** que el arquero mide con una regla y reporta; el factor se guarda por usuario.
Sin eso el navegador aplica "ajustar al area imprimible" en silencio y el tape sale mal — es el dolor
mas documentado del rubro. La hoja cada 2 m que ya existe queda como la version Free.
**~13 SP · riesgo medio.**

## [ ] F1-D · [Epica] Corte por angulo

Regla del coseno: `distanciaHorizontal = cos(angulo) × distanciaLineaDeVision`, y despues se busca la
marca de esa distancia horizontal. Inclinometro via `DeviceOrientationEvent`; en iOS 13+ exige
`requestPermission()` disparado desde un gesto del usuario y contexto seguro, con ingreso manual como
alternativa siempre disponible. Es bloqueante para campo, 3D y caza. ~8 SP · riesgo medio.

## [ ] F1-E · [Epica] Mark Doctor por marca

Exponer el residuo de cada marca contra la parabola, señalar la peor con su magnitud y sugerir volver
a tirar esa distancia. El calculo **ya existe** (`maxAbsResidual` y `residuals` de `fitQuadratic`):
falta la UI y el umbral que decide cuando vale la pena avisar. Es la feature con mejor relacion
impacto/esfuerzo del producto y ningun competidor la tiene. ~5 SP · riesgo bajo. → ADR-001

## [ ] F1-F · [Epica] Presets de rondas

WA outdoor 70/50 m, WA indoor 18/25 m, NFAA Field y Hunter (11, 15, 19, 23, 28, 32, 36, 40, 48, 53,
58 y 64 yd) y 3D marcado. Generan la lista de distancias a cargar o a imprimir, en la unidad del
arquero. ~5 SP · riesgo bajo.

## [ ] F1-G · [Epica] Equipo estructurado

Reemplazar el `notes` de texto libre por campos reales: spine, peso de punta, largo, vanes, nocks,
peso total y velocidad medida. Sin esto no hay semilla balistica (F4) ni comparacion entre sets. La
migracion conserva el texto libre en `notes` y no intenta parsearlo: adivinar mal el spine de alguien
es peor que dejarlo escribirlo. ~8 SP · riesgo bajo.

## [ ] F1-H · [Epica] Export e import

CSV y PDF de marcas por mira y por set. El import valida fila por fila y **muestra que va a entrar
antes de que entre**. Higiene de producto pago: el que paga tiene derecho a llevarse sus datos.
~5 SP · riesgo bajo.

---

# Fase 2 — Monetizacion

> No arranca hasta que la Fase 1 este en produccion.

## [ ] F2-A · [Epica] Entitlements: catalogo y enforcement

Catalogo declarativo en `@bow-sight/domain`, funcion pura `can(plan, feature, usage)` que importan la
API **y** la PWA, y middleware que evalua el limite **antes de escribir**. El error dice cual es el
tope y que plan lo levanta. Incluye `selectActiveIds`, la funcion pura que decide que queda activo al
bajar de plan. **Tests: el recurso N+1 en Free falla con su codigo; bajar con 6 miras deja 1 activa y
5 bloqueadas sin borrar ninguna.** ~13 SP · riesgo alto. → ADR-003

## [ ] F2-B · [Epica] Stripe: Checkout, Portal y webhooks

Checkout para el alta y Customer Portal para gestionar — no se construye una UI propia de cancelar y
cambiar tarjeta. Webhooks: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`,
`invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`. Verificacion de firma sobre el
**cuerpo crudo**, e idempotencia por id de evento. Montado fuera de `/api/v1` y fuera del limitador
por IP. ~13 SP · riesgo alto.

## [ ] F2-C · [Epica] Mercado Pago: preapproval y webhooks

`preapproval_plan` por plan y moneda, `preapproval` por usuario. Topicos
`subscription_preapproval_plan`, `subscription_preapproval` y `subscription_authorized_payment`.
Firma HMAC verificada con `safeEqual`, y despues **siempre re-consultar el recurso a la API de MP**:
la notificacion es un puntero, no un dato. Es el error de integracion mas comun del proveedor.
~13 SP · riesgo alto.

## [ ] F2-D · [Epica] Trial, dunning y gracia

Trial de 14 dias **sin tarjeta** al registrarse. Al fallar un cobro, `past_due` con siete dias de
gracia y avisos en el dia 0, 3 y 6. Al vencer, `effectivePlan()` devuelve `free` **por reloj**: no
hace falta que corra nada. El job nocturno solo manda el mail. ~8 SP · riesgo medio.

## [ ] F2-E · [Epica] Landing: precios y checkout

La tabla de planes leida de la API, el alta con trial, y el camino completo desde la busqueda hasta
la cuenta creada. Los precios **no** se hardcodean en el front: cambiar un precio no puede exigir un
deploy de la landing. ~8 SP · riesgo bajo.

## [ ] F2-F · [Epica] Reconciliacion

Job diario que compara el estado local contra el del proveedor y alerta ante cualquier discrepancia.
Un webhook perdido no puede significar que alguien pague y no tenga su plan. ~5 SP · riesgo medio.

---

# Fase 3 — Offline-first

> No arranca hasta que la Fase 2 este en produccion. Va **despues** de que el formato del wire este
> congelado por F1 y F2: una cola serializada con el formato viejo, reanudada tras un deploy que
> espera el nuevo, reintenta para siempre. → ADR-006

> 🔴 **Deuda que entra aca:** la spec pide **UUIDv7** generado por el cliente (§341) y el codigo usa
> `crypto.randomUUID()`, que es v4. Recien importa en esta fase: v7 es ordenable por tiempo, y de eso
> dependen el orden de la cola y la localidad de los indices. Cambiarlo antes habria sido churn.

## [ ] F3-A · [Epica] Persistencia y cola de mutaciones

Persister en IndexedDB en vez de `localStorage`, mutaciones persistidas y reanudadas al reconectar, y
**cola serializada**: el POST de la mira tiene que llegar antes que el de su marca, o la marca
responde 404. Cada mutacion se registra con su clave, porque una mutacion deserializada llega sin su
funcion. Se **porta el patron** de `bv-bahia-archers-league`, que ya lo tiene andando. ~13 SP ·
riesgo alto.

## [ ] F3-B · [Epica] Ids del cliente e idempotencia

UUIDv7 generado en el cliente desde F0, mas `Idempotency-Key` en el servidor con su tabla y su TTL de
24 h. Reconectar y reintentar no puede crear dos veces la misma marca. ~8 SP · riesgo alto.

## [ ] F3-C · [Epica] Deteccion de escritura obsoleta

Cada PATCH manda el `updatedAt` que el cliente vio; si el servidor tiene uno mas nuevo, responde
`BS-MARK-409-006` con el estado actual y la UI pregunta cual queda. **Nunca last-write-wins
silencioso:** descartar sin avisar una marca medida hace diez minutos en la linea de tiro es
inaceptable. ~8 SP · riesgo medio.

## [ ] F3-D · [Epica] Estado de sincronizacion en la UI

Quitar los guardas de `useOnlineStatus` que deshabilitan los botones —salvo en login, registro y
cobro, que no se pueden encolar—, y mostrar cuantos cambios hay pendientes y cuando se sincronizaron.
El estado de red se decide con una **sonda real** contra el healthcheck, no con `navigator.onLine`:
en un campo de tiro con una barra de señal devuelve `true` y las mutaciones se reanudan contra un
pozo. ~8 SP · riesgo medio.

---

# Fase 4 — Diferenciacion

> No arranca hasta que la Fase 3 este en produccion.

## [ ] F4-A · [Epica] Semilla balistica

Integracion **RK4** de la trayectoria con arrastre y busqueda binaria sobre el angulo de lanzamiento
hasta que la altura de impacto converge: con arrastre no hay solucion cerrada. Entradas: velocidad
(fps), peso (grains), coeficiente de arrastre (0.35–0.50 con vanes, hasta 0.85 con broadheads fijos)
y geometria peep-a-pin. Genera marcas `seeded`, que **ceden ante cualquier marca `measured`** del
mismo tramo. Ataca directamente la metrica de activacion: da un tape usable antes de la primera
flecha. **~21 SP · riesgo alto.** → ADR-001

## [ ] F4-B · [Epica] Motor de condiciones

Registrar temperatura y altitud por sesion y **aprender el delta observado por arquero**, en vez de
estimarlo por formula. La temperatura y la altitud son los dos factores que importan; la humedad es
despreciable. Es la version empirica de algo que la competencia hace teorico. ~13 SP · riesgo medio.

## [ ] F4-C · [Epica] Comparar sets superpuestos

Ver dos o mas sets de flechas sobre la misma regla, con la diferencia de marca por distancia. Es la
pregunta que se hace todo el que prueba flechas nuevas. ~8 SP · riesgo bajo.

## [ ] F4-D · [Epica] Historial de cambios

Que cambio en las marcas, cuando y desde que dispositivo. Permite responder "que hice distinto el mes
pasado" sin que el arquero tenga que acordarse. ~8 SP · riesgo bajo.

## [ ] F4-E · [Epica] Compartir con coach

Invitacion por email, estados `pending | accepted | revoked`, y acceso de **solo lectura** revocable
con efecto inmediato. Hasta 3 coaches en Max. Es lo que sostiene el tier superior en un producto
vertical. **Tests: el coach nunca escribe, desde ningun endpoint; revocar corta el acceso en el
momento.** ~13 SP · riesgo alto. → ADR-000

---

# Fase 5 — Salida al mercado

> Se solapa con F4: el contenido y la infraestructura de lanzamiento no dependen de las features de
> diferenciacion.

## [ ] F5-A · [Epica] Contenido de la landing

Las secciones reales, en los dos idiomas: contra el papelito, contra la competencia, precios y
empezar. La comparacion cita el enfoque tecnico de cada producto, no adjetivos. **Nada de testimonios
inventados ni capturas de features que no existen.** ~13 SP · riesgo bajo.

## [ ] F5-B · [Epica] Legales

Terminos, privacidad y tratamiento de datos, en los dos idiomas. Descarga de datos y baja de cuenta
funcionando de punta a punta. ~8 SP · riesgo medio.

## [ ] F5-C · [Epica] Sentry y analytics

Sentry en la API y en las dos apps, con scrubbing obligatorio de la cookie de sesion, la
`Idempotency-Key` y el email — Sentry captura headers por defecto y la cookie de sesion es una
credencial. Analytics cookieless, sin banner de consentimiento. Eventos: registro, verificacion,
primera mira, quinta marca (la activacion), checkout iniciado, checkout completado y limite alcanzado
con su feature. ~8 SP · riesgo bajo.

## [ ] F5-D · [Epica] SEO y auditoria

Meta tags por pagina e idioma, `hreflang`, datos estructurados, y la auditoria de performance y
accesibilidad antes de abrir. ~8 SP · riesgo bajo.

## [ ] F5-E · [Epica] Backups verificados

El restore probado, cronometrado y **anotado en la bitacora**. Un backup sin restore probado no es un
backup. ~5 SP · riesgo medio.

## [ ] F5-F · [Epica] Lanzamiento

Validacion primero en el CBA y la liga bahiense —la red propia, feedback en horas— y despues
ArcheryTalk, que tiene un foro de reviews y precedentes recientes de desarrolladores presentando
apps, y r/Archery. El angulo de comunicacion es el diferenciador tecnico: _pasa exacto por las marcas
que tiraste; los demas te ajustan una curva que no pasa por ninguna._ ~8 SP · riesgo medio.
