# Bitacora del proyecto

Registro cronologico de cada cambio significativo. **Mas nuevo arriba.**
Escribir la entrada es parte del Definition of Done (spec §14).

Se registra: features, fixes, decisiones, cambios de spec, incidentes y cambios de infra.
No se registra: refactors internos sin impacto observable ni cambios de formato.

## Formato de entrada

```markdown
## YYYY-MM-DD — <titulo en imperativo>

- **Modulo:** <modulo o `infra` / `spec` / `docs`>
- **Tipo:** feature | fix | decision | spec | infra | incidente
- **Commit/PR:** <sha corto o enlace al PR>
- **Trello:** <enlace a la o las tarjetas>
- **Que cambio:** 1-3 lineas, en resultado observable, no en implementacion.
- **Por que:** el motivo, no la descripcion del diff.
- **Impacto:** modelo de datos / API / migracion / codigos de error nuevos / ninguno.
- **Pendiente:** lo que quedo afuera y por que.
```

---

## 2026-09-09 — La app hace lo que el producto promete: cargar marcas y calcular

- **Modulo:** `pwa` · `infra`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/09SUee2u (F0-17), que ya anotaba esto como lo que seguia
- **Que cambio:** hasta hoy la PWA dejaba crear una cuenta y **ver una lista vacia**. Peor: `Sights`
  ya enlazaba a `/miras/nueva` y a `/miras/:id`, y ninguna de las dos existia — tocarlas rebotaba a
  la home **en silencio**. Ahora existen las tres pantallas que faltan y el producto se puede usar.
- **Por que:** era lo que faltaba para poder probarla en local. Una app que registra cuentas y no
  hace nada mas no se puede evaluar.
- **Impacto:** ninguno sobre la API ni el modelo de datos: las tres pantallas consumen endpoints que
  ya existian desde F0-15.

### Las pantallas

| Ruta           | Que es                                                 |
| -------------- | ------------------------------------------------------ |
| `/miras/nueva` | Crear una mira: nombre y el recorrido de su escala     |
| `/miras/:id`   | **La del producto**: la regla, las marcas y el calculo |
| `/equipo`      | Los sets de flechas                                    |

🔴 `/miras/nueva` se declara **antes** que `/miras/:id`: al reves, "nueva" se leeria como un id y la
pantalla pediria una mira que no existe. Hay un test para eso.

🔴 `/equipo` no es configuracion opcional. **Una marca pertenece a un set de flechas**, no a la mira
sola: las mismas distancias con flechas mas pesadas dan otras marcas. Sin un set no se puede anotar
nada, asi que la pantalla dice eso y deshabilita el boton en vez de dejar escribir dos numeros para
fallar despues.

🔴 **El calculo lo hace el servidor.** El mismo math esta en `@bow-sight/domain` y podria correr en
el cliente, pero el servidor es la autoridad sobre lo que el arquero tiene cargado: calcularlo aca
abriria la puerta a que la app y la hoja impresa digan cosas distintas.

🔴 **La conversion ocurre en el borde.** El arquero escribe centimetros —como esta impreso en su
mira— y viaja milimetros. Hay un test por pantalla: si alguna mandara centimetros, la escala quedaria
diez veces chica y no se notaria hasta ver la regla.

### `pnpm dev:sandbox`

Para probar la app ya no hace falta instalar Mongo ni escribir un `.env`: levanta la API contra un
Mongo **efimero en memoria con replica set**, e imprime la API, el contrato y un **buzon** de donde
sale el enlace de verificacion.

El arnes es **el mismo** que usan los E2E (`scripts/ephemeral-api.ts`), porque el requisito es el
mismo: una base de verdad, con transacciones, que no haya que instalar. 🔴 Los datos se pierden al
cerrarlo, a proposito: un sandbox que sobrevive tienta a usarlo como si fuera un ambiente.

### Verificado corriendolo, no solo en tests

Con las cinco marcas del autor cargadas, a 37 m la app muestra `18.1 cm` y dice **"entre marcas
tuyas"**; a 70 m dice **"estimada fuera de lo que mediste"**. La regla dibuja las cinco medidas, las
calculadas intermedias, los 18 m de sala con `≈` y la consulta. A 30 m devuelve exactamente `12.0`,
que es la marca cargada: la promesa del producto (ADR-001).

- **Tests:** 5 E2E del camino completo (de cuenta nueva a marca calculada) y 20 unitarios de las tres
  pantallas. El gate de cobertura de la PWA, que estaba en 90/75, **fallo al agregar las pantallas** y
  se cumplio escribiendo los tests, no bajandolo.

## 2026-09-09 — Responsive verificado: tres bugs que estaban a la vista y nadie miro

- **Modulo:** `pwa` · `landing` · `ui`
- **Tipo:** fix
- **Commit/PR:** —
- **Trello:** https://trello.com/c/09SUee2u (F0-17) · https://trello.com/c/jCphaxPE (F0-18)
- **Que cambio:** el `Definition of Done` pide **responsive 360/768/1440** y esa casilla estaba sin
  marcar en el PR #1. Al ir a verificarlo aparecieron tres bugs, ninguno sutil.
- **Por que se verifica midiendo y no mirando:** una captura la mira una persona una vez y despues
  nadie. `e2e/responsive.spec.ts` corre en cada push: 80 tests entre las tres anchuras, los dos
  temas, las dos apps, y falla nombrando el elemento exacto que se desborda.
- **Impacto:** ninguno sobre el modelo de datos ni la API.

### 🔴 La regla de los 44 px nunca estuvo en efecto

`min-h-11` y `min-h-13` estaban escritos en `@bow-sight/ui`, documentados en el `CLAUDE.md` de la
PWA y repetidos en la spec — y **Tailwind no los generaba**. Tailwind v4 descubre las fuentes solo
pero ignora `node_modules`, y con pnpm `@bow-sight/ui` es un symlink que vive justamente ahi. Cero
ocurrencias de `min-h-11` en el CSS construido: **todos** los botones y campos de las dos apps
median 21 px de alto contra los 44 que exige usar la app de pie y con guantes.

Se arregla con `@source '../../../packages/ui/src'` en el `styles.css` de cada app. Va **despues**
de los `@import` y no entre ellos: en CSS todos los `@import` van primero, y ponerlo en el medio
invalida los que siguen — lo que deja la app sin los tokens del tema. Ese fue el primer intento, y
el sintoma fue peor que el problema original.

### 🔴 Con la API caida, la pantalla quedaba en blanco

`SoloPublica` hacia `return null` mientras averiguaba si habia sesion. Con un 5xx el cliente
reintenta, asi que el arquero se quedaba mirando **una pantalla vacia** —indistinguible de un
telefono colgado— y despues, si el error persistia, `Privada` lo mandaba a entrar.

Mandarlo a entrar es lo peor de las dos cosas: le dice que se deslogueo cuando lo unico que pasa es
que el servidor no contesta. Ahora **"no hay sesion" y "no pudimos preguntar" se tratan distinto**:
la segunda muestra el error con un boton de reintentar, y distingue el "sin conexion" del "se rompio
algo nuestro". Entrar y crear cuenta siguen viendose igual aunque falle la consulta: son publicas, y
bloquear el login por un problema nuestro seria dejarlo afuera.

Ademas hay un `ErrorBoundary` en la raiz: sin el, cualquier error de render desmonta el arbol entero
y no queda **nada**, ni un boton para recargar.

### Los enlaces de texto tambien se tocan

`textLinkClasses()` en `@bow-sight/ui`, junto a `buttonClasses()`. Un "ya tengo cuenta" de 20 px es
tan imposible de acertar con guantes como un boton de 20 px, y encima es el unico camino entre crear
cuenta y entrar. Se ven igual que antes; lo que crece es el area.

**Y la landing tambien.** El primer test de 44 px solo miraba la PWA — un olvido mio: la landing se
abre en el telefono de alguien que **todavia no es usuario**, y si no puede tocar "Precios" no llega
a serlo. El logo, "Precios" y las dos legales median entre 20 y 24 px. La comprobacion ahora recorre
las cinco pantallas.

- **Lo que si estaba bien:** cero desborde horizontal en las tres anchuras, en claro y en oscuro, en
  las dos apps. La regla entra entera con sus marcas incluso a 360.
- **Verificado tambien el radio de impacto del arreglo de Tailwind:** el CTA de la landing usaba
  `buttonClasses()` desde siempre y se veia como texto en negrita; ahora mide 52 px, con su fondo de
  acento y su radio. Cambiar la generacion de CSS toca **todo** lo estilado de las dos apps, asi que
  no alcanzaba con medir alturas de controles.
- **Nota de herramienta:** el `tsconfig.e2e.json` ahora incluye `lib: DOM`. El cuerpo de
  `page.evaluate` corre en el navegador, no en Node.

## 2026-09-08 — OpenAPI generado desde el registro de rutas

- **Modulo:** `api`
- **Tipo:** feature
- **Commit/PR:** https://github.com/BraianVaylet/bow-sight-project/pull/1
- **Trello:** https://trello.com/c/h77TW7cP (F0-16)
- **Que cambio:** `GET /api/v1/docs` devuelve el contrato de la API en OpenAPI 3.1, con sus 20
  rutas, sus parametros, sus cuerpos y sus codigos de error.
- **Por que:** era un hueco declarado en el PR. La tarjeta F0-16 planteaba el OpenAPI saliendo del
  mismo registro de rutas y se cerro sin esa parte; el `Definition of Done` lo pide y la casilla
  estaba sin marcar.
- **Impacto:** una ruta publica nueva. Ningun cambio en el modelo de datos.
- **Como esta armado, que es lo que importa:**
  - La lista de rutas sale de **`app.routes`**: la app montada de verdad. La descripcion de cada una
    sale de un catalogo declarativo, y los cuerpos de los **mismos schemas de Zod** que validan en
    runtime (`z.toJSONSchema`). No hay una segunda copia de ninguna regla.
  - 🔴 **Una ruta montada sin entrada en el catalogo hace fallar `createApp`.** Es el gemelo del
    fixture de ataque de la suite de aislamiento: la unica forma de que la documentacion no quede
    desactualizada es que no arranque cuando lo esta. El test verifica tambien el sentido contrario
    —documentar algo que ya no existe manda a un integrador a escribir codigo contra un 404— y que
    todo codigo de error citado este declarado en `docs/errors.md`.
- 🔴 **Se sirve JSON y nada mas, y no es pereza.** Montar un visor de OpenAPI significa cargar un
  script de un CDN en el **mismo origen que la cookie de sesion**: quien controle ese CDN tendria
  ejecucion de codigo justo donde vive `bs.session_token`. El JSON lo abre cualquier cliente de
  OpenAPI desde afuera, sin pedirnos esa superficie.
- **Dos cosas que aparecieron armandolo:**
  - `/docs` caia bajo el `use('*')` de la zona protegida y respondia **401**. Un contrato que exige
    sesion para leerse no es un contrato: se registra **antes** de esa barrera.
  - El documento se armaba leyendo `app.routes` en el momento del pedido, asi que veia lo que
    alguien montara **despues** de `createApp` — el arnes de E2E le agrega un buzon de mails que no
    es parte del producto, y el contrato respondia 500. Ahora se arma sobre una **foto** tomada al
    final de `createApp`.
- **Verificado por HTTP**, no solo en tests: 20 rutas, `calculate` con sus cuatro parametros y sus
  respuestas 200/401/404/422, y el buzon del arnes fuera del contrato.

## 2026-09-08 — Cierre de la Fase 0: 19 de 21, con una bloqueada y una a medias

- **Modulo:** `docs`
- **Tipo:** decision
- **Commit/PR:** —
- **Trello:** el tablero, sincronizado con `docs/ACTION-PLAN.md`
- **Que cambio:** F0-06 (los cuatro `CLAUDE.md`) quedo cerrada al escribirse el de la landing. Las
  **21 tarjetas de F0 tienen su etiqueta puesta**, por color. Y se agregaron los tres `railway.json`
  con sus comandos de arranque **verificados corriendolos**, que era la parte de F0-20 que no
  dependia de aprovisionar nada.
- **Por que:** el tablero manda en el **estado** y el plan manda en el **contenido**. Estaban
  divergiendo: dos tarjetas seguian en `En proceso` cuando una ya estaba terminada, y `F0-08`
  figuraba `[x]` en el plan sin estarlo.
- **Impacto:** ninguno sobre el codigo.
- **Estado real de la Fase 0:**
  - **19 completadas.**
  - **F0-08 en `[~]`**, y se queda ahi: el MCP de Trello **no puede crear ni renombrar etiquetas**
    (`trelloWriteBoard` solo crea tableros). Las seis por defecto ya estan **asignadas a las 21
    tarjetas**, pero sin nombre. Nombrarlas a mano —azul `SPEC`, violeta `TECNICO`, verde `API`,
    amarillo `PWA`, naranja `LANDING`, rojo `BUG`— cierra la tarjeta sin tocar nada mas, porque las
    tarjetas ya estan pintadas con ese mapeo.
  - **F0-20 bloqueada**, y no por nosotros: necesita el proyecto en Railway, el cluster de Atlas con
    replica set y las claves de Resend, Stripe y Mercado Pago. Cuentas del dueño, que ademas gastan
    plata. El MCP de Railway esta **sin autorizar** en la sesion, asi que tampoco se podria
    aprovisionar desde aca.
- 🔴 **La Fase 1 no arranca hasta que la Fase 0 este en produccion, usada por gente real.** Es la
  regla de corte del proyecto y F0-20 es lo que falta para cumplirla. Empezar F1 ahora seria
  construir sobre algo que nadie uso todavia.

## 2026-09-08 — F0-21: el script que trae los datos reales desde SQLite

- **Modulo:** `infra`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/8s2VEJ3x (F0-21) — movida a **Completadas**
- **Que cambio:** `scripts/import-sqlite.ts` lee la base de `bv-bow-sight`, traduce cada fila al
  modelo nuevo y la escribe en Mongo **dentro de una transaccion**, verificando los conteos contra la
  base y no contra el array que acaba de armar. Tiene `--dry-run`. 27 tests, incluyendo la migracion
  corriendo de punta a punta contra un Mongo efimero en replica set.
- **Por que:** son las marcas de años del autor. Se corre **una sola vez** y no se puede repetir: si
  convierte mal, lo que se pierde no se recupera. Por eso la traduccion es una funcion pura y
  separada, probada contra una SQLite de verdad con el schema real.
- **Impacto:** ninguno sobre la API. `better-sqlite3` entra como dependencia **de desarrollo** y
  queda fuera de la imagen de produccion.
- 🔴 **No migra usuarios ni sesiones, a proposito.** El hash viejo es argon2id sobre un alias; Better
  Auth usa su propio esquema sobre un email. Traducir eso seria escribir criptografia para un solo
  usuario. El arquero se crea la cuenta por el camino normal, pasa su `--email`, y el script mete los
  datos abajo de ese `userId` (ADR-000) y deja la cuenta verificada. Las sesiones viejas no se
  importan: son tokens firmados con otra clave, y meterlas seria dejar en la base sesiones que nunca
  van a validar.
- **Detalles que no son cosmeticos:**
  - `Math.round(cm * 10)`: en punto flotante `4.1 * 10` da `41.00000000000001`, y esa basura termina
    impresa en la regla. Hay un test para ese numero exacto.
  - La base vieja es multiusuario. Con mas de un usuario y sin `--alias`, el script **se planta**:
    elegir uno "por defecto" seria escribir los datos de otra persona abajo de esta cuenta.
  - Escribe en `mark`, `sight`, `bowSetup`, `arrowSet` — los nombres **singulares** de la spec §5.4.2,
    que es donde viven los indices, y no los que Mongoose pluralizaria.
  - Todo lo migrado queda como `origin: 'measured'`. Lo que hay en la base vieja lo tiro el arquero;
    marcarlo de otra forma seria decirle que una marca suya es una estimacion nuestra (ADR-001).
- **Dos cosas que aparecieron al lintear `scripts/` por primera vez:**
  - 🔴 `pnpm lint` era `turbo run lint`, que **solo recorre paquetes del workspace**: `scripts/`,
    `e2e/` y los configs de la raiz nunca se lintearon. Ahora entran, con globals de Node.
  - 🔴 Y ahi salio que la regex de la regla de ADR-002 en `eslint.config.js` tenia las barras
    invertidas comidas por el string: `'\.'` en un literal simple llega como `.`, que matchea
    cualquier caracter. La regla funcionaba de casualidad. Arreglada y verificada provocando la
    violacion a proposito.
- 🔴 **Desviacion anotada, no arreglada:** la spec §341 pide **UUIDv7** generado por el cliente y el
  codigo usa `crypto.randomUUID()`, que es **v4**. El script sigue al codigo para no dejar dos
  formatos conviviendo. Se resuelve en F3, que es donde el orden temporal del id importa de verdad.
- **Pendiente:** correrlo sobre el `.db` real del autor. Depende del Atlas de F0-20.

## 2026-09-08 — F0-19: correr el CI entero y arreglar lo que no era cierto

- **Modulo:** `infra`
- **Tipo:** fix
- **Commit/PR:** —
- **Trello:** https://trello.com/c/5Z90QxMy (F0-19) — movida a **Completadas**
- **Que cambio:** el pipeline ya existia escrito desde F0-02; lo que se hizo fue **ejecutarlo paso
  por paso**. Estaba en rojo en dos de sus tres jobs. Ahora corre entero y en verde: formato →
  enlaces de la documentacion → lint → typecheck → **build** → tests con gate de cobertura → E2E →
  auditoria de dependencias.
- **Por que:** un workflow que nadie corrio es una intencion, no un CI. Los tres problemas de abajo
  estaban esperando al primer PR.
- **Impacto:** ninguno sobre el modelo de datos ni sobre la API. Dependencia nueva en la raiz:
  `@hono/node-server`, que necesita el arnes de E2E.
- **Lo que estaba roto:**
  - 🔴 **`pnpm test:coverage` fallaba.** La PWA cubria 29,9% contra un gate de 50%: `SignUp` en 0%,
    `errorText` en 8%. Se escribieron 21 tests (formularios de auth, lista de miras, el puente de
    errores) y la cobertura quedo en 96,8% de lineas. **El gate subio a 90/75**: uno 40 puntos por
    debajo de la realidad deja bajar la cobertura sin que nadie lo note.
  - 🔴 **`vite-react-ssg dev` ignora `--port`.** La landing se levantaba en el 5173 por defecto,
    chocaba con la PWA y se corria sola al 5174 **en silencio**. El job de E2E esperaba dos minutos
    a un servidor que nunca iba a estar en el 5176 y moria por timeout. Los tres puertos quedaron
    fijos en sus `vite.config.ts` con `strictPort`, que hace fallar en vez de moverse.
  - `turbo.json` hacia depender `test` y `test:coverage` de `^build` —el build de las
    dependencias—, no del propio. Los tests de la landing leen `dist/`: en un checkout limpio
    fallaban. Verificado borrando `dist/` y corriendo la suite.
- 🔴 **Un bug de producto que aparecio escribiendo los tests:** cinco claves de error que la API
  puede devolver hoy no tenian texto en la PWA (`mark.badAngle`, `mark.badDistance`,
  `mark.notFound`, `sight.missingClickSize`, `equipment.incompleteSpecs`, mas `system.internal`).
  El arquero veia `Algo salió mal (BS-…)`, que es exactamente la pantalla que ese puente existe para
  evitar. El test que lo detecto **lee las claves del codigo de la API**, no de una lista copiada:
  una lista copiada se desactualiza en silencio.
- **E2E, que antes no existian:** `e2e/support/api-server.ts` levanta la API real contra un Mongo
  efimero en replica set y expone un buzon (`GET /e2e/mails`) que solo existe en el arnes. 16 tests
  en dos proyectos (Pixel 7 y desktop): crear cuenta, sesion que sobrevive a recargar, la guarda de
  ruta, el mensaje unico de credenciales invalidas, el mail de verificacion apuntando a **nuestra**
  ruta, y la landing con su demo pasando exacto por la marca medida **sin una sola llamada a la
  API**. Es la primera vez que las tres piezas arrancan juntas.
- **Pendiente:** `deploy-staging` queda apagado detras de la variable de repositorio
  `DEPLOY_STAGING` hasta que exista Railway (F0-20). Sin eso fallaba en cada push a `main`, y un CI
  en rojo permanente entrena a todos a ignorarlo. Faltan los dos caminos criticos que la app
  todavia no tiene: cargar cinco marcas y ver una calculada, e imprimir el tape. Entran con F1.

## 2026-09-08 — F0-18: la landing prerenderizada, con la demo de la regla adentro del HTML

- **Modulo:** `landing`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/jCphaxPE (F0-18) — movida a **Completadas**
- **Que cambio:** el sitio publico existe y se prerenderiza con `vite-react-ssg`: cuatro paginas
  (home, precios, terminos, privacidad), cada una con su `<title>`, su meta description, su Open
  Graph y su canonical, mas `sitemap.xml` y `robots.txt` emitidos en el build. La demo interactiva
  de la regla corre `@bow-sight/domain` en el cliente, sin API y sin cuenta, y **viene entera en el
  HTML**: el SVG, sus ticks y sus seis marcas estan antes de que cargue un kilobyte de JavaScript.
- **Por que:** la landing es el canal de adquisicion (ADR-004). Para un buscador, una SPA vacia es
  una pagina sin contenido. Y el argumento de venta —la curva pasa exacto por lo que mediste— se
  demuestra mejor dejando que lo prueben que explicandolo: en la demo, a 30 m, la regla muestra
  `12.0`, que es exactamente la marca cargada. Hay un test que lo verifica sobre el HTML emitido.
- **Impacto:** ninguno sobre el modelo de datos ni sobre la API. La landing no habla con el backend.
- 🔴 **Criterio de aceptacion no cumplido, movido de fase:** F0-18 pedia `hreflang` en las rutas por
  idioma. Las rutas EN no existen hasta F1-A, y un `hreflang` que apunta a una URL que devuelve 404
  es peor que su ausencia: Search Console lo marca como error y descarta el grupo entero. Se movio a
  F1-A junto con `x-default` y las dos entradas por pagina en el sitemap. Queda escrito en las dos
  tarjetas para que no se pierda.
- **Dos cosas que solo aparecieron al inspeccionar el HTML emitido, no el arbol de React:**
  - El `index.html` traia un `<title>` estatico, asi que cada pagina salia con **dos titles** —el
    estatico y el de `<Head>`—, que son dos señales distintas para el crawler. Se saco el estatico y
    hay un test que cuenta que haya exactamente uno.
  - `turbo.json` hacia depender `test` de `^build`, el build de las **dependencias**, no el propio.
    Los tests de la landing leen `dist/`: en un checkout limpio fallaban. Ahora
    `@bow-sight/landing#test` depende tambien de `build`, verificado borrando `dist/` y corriendo la
    suite. La razon quedo en `apps/landing/CLAUDE.md` porque turbo rechaza claves de comentario.
- **Pendiente:** el formulario de contacto y la auditoria de SEO y performance son F5. La pagina de
  precios muestra los planes pero todavia no lleva a ningun checkout: eso es F2.

## 2026-09-07 — F0-17: la PWA, instalable y con las pantallas que los mails necesitaban

- **Modulo:** `pwa`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/09SUee2u (F0-17) — movida a **Completadas**
- **Que cambio:** la app del arquero existe: se instala desde el navegador, tiene tema claro y
  oscuro sin parpadeo, entrar, crear cuenta, recuperar la clave, y las dos pantallas a las que
  llevan los mails de F0-14. La lista de miras ya lee de la API. 7 tests de navegacion.
- **Por que:** F0-14 dejo enlaces apuntando a `/restablecer` y `/email-verificado` que todavia no
  existian. Un mail que lleva a una pantalla en blanco es peor que no mandarlo.
- **Impacto:** ninguno sobre el modelo de datos. **Paquete nuevo:** `@bow-sight/client`, con el
  cliente de API que desarma el envelope conservando la clave y los `params` — sin inventar prosa —
  y distingue "sin red" de "el servidor fallo", que es lo que permite reintentar solo lo que tiene
  sentido reintentar.
- **Pendiente:** la pantalla de la mira —la regla, la curva, la calculadora— es lo que sigue. Hoy la
  home lista miras pero no se puede crear ninguna desde la app. Y `app/errorText.ts` es un puente
  declarado hasta F1-A: traduce las claves de la API a español a mano, con el mapa escrito para que
  su reemplazo sea cambiar el cuerpo por `t()`.

## 2026-09-07 — F0-15 y F0-16: el modelo de datos, con el aislamiento verificado ruta por ruta

- **Modulo:** `equipment` · `sights` · `marks`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/HP0TT2FB (F0-15) y https://trello.com/c/h77TW7cP (F0-16) —
  movidas a **Completadas**. Tambien cierra F0-10 (https://trello.com/c/9GwbT68C).
- **Que cambio:** un arquero ya puede cargar su equipo, crear miras y anotar marcas por la API, y
  **preguntarle a la calculadora por cualquier distancia**, con corte por angulo incluido. 153 tests
  en la API, 93% de lineas.
- **Por que:** es el producto. Todo lo anterior era piso.
- **Impacto:** **modelo de datos** — `bowSetup`, `arrowSet`, `sight` y `mark`, con las tres capas de
  aislamiento de ADR-000 completas. **Codigos nuevos:** los de `EQUIP`, `SIGHT` y `MARK`, ya
  declarados en `docs/errors.md`.

  **Dos bugs que aparecieron al correr los tests, no al leerlos.** El primero es el que asusta: los
  modelos escribian en `marks` y la migracion indexaba `mark`, porque Mongoose pluraliza por
  defecto. **Todos los indices unicos estaban sobre colecciones que nadie usaba** — incluido el que
  sostiene la idempotencia de los webhooks de cobro. No se habria notado hasta el primer duplicado
  en produccion. El segundo: `GET /sights/:id/marks` devolvia `200 []` para una mira borrada o
  ajena en vez de 404; no filtraba datos, pero rompia la regla de que lo que no es tuyo no existe.
  Los dos tienen su test de regresion.

- **Pendiente:** `computeSightMarks` redondea a 0.1 de la unidad canonica, que ahora son
  **milimetros**: 0.1 mm es diez veces mas fino de lo que un arquero puede fijar en la mira. No es
  un error de calculo —el valor esta bien— pero se muestra con una precision que no existe. Se
  corrige al generalizar el modelo para unidades (F1-B), que es donde entra el concepto de "paso que
  el arquero puede fijar". Anotado en `docs/domain/SIGHT-MATH.md`.

## 2026-09-07 — F0-14: identidad con email, verificacion y reset

- **Modulo:** `auth`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/3zy4JO03 (F0-14) — movida a **Completadas**
- **Que cambio:** un arquero ya puede crearse una cuenta con email y contraseña, recibir el mail de
  verificacion en **su** idioma, entrar, salir y recuperar la clave. Reemplaza la pregunta de
  seguridad hardcodeada en español de `bv-bow-sight`. 99 tests en la API, 95% de lineas.
- **Por que:** sin identidad real no hay recuperacion de cuenta, ni recibo, ni sync entre
  dispositivos — las tres cosas que un producto pago tiene que dar y la app personal no daba.
- **Impacto:** **modelo de datos** — colecciones de Better Auth (`user`, `session`, `account`,
  `verification`) mas `locale`, `distanceUnit`, `planCode` y `planValidUntil` en `user`. **Codigos
  nuevos:** los siete de `AUTH` ya declarados en `docs/errors.md`. **Variables nuevas:** `PWA_URL`,
  `RESEND_API_KEY` y `MAIL_FROM`; las dos ultimas obligatorias en un ambiente desplegado.

  **Un bug que aparecio al correr el test, no al leer el codigo:** el enlace del mail de
  verificacion apuntaba a la ruta por defecto de Better Auth, que no esta montada porque las rutas
  de auth van **envueltas** en nuestro envelope. El mail llevaba a un 404 y la cuenta no se podia
  verificar nunca. Ahora la verificacion tiene ruta propia y **redirige a la PWA**: el arquero llega
  desde su cliente de correo, tiene que terminar en una pantalla y no en un JSON. Quedo su test de
  regresion.

- **Pendiente:** el limitador por IP sobre `/auth/*` y el bloqueo por intentos fallidos entran con
  el resto de las defensas. La pantalla `/restablecer` y `/email-verificado` de la PWA se construyen
  en F0-17: hoy los enlaces apuntan ahi y todavia no existen.

## 2026-09-07 — F0-13: Mongo con replica set, migraciones e indices

- **Modulo:** `api`
- **Tipo:** infra
- **Commit/PR:** —
- **Trello:** https://trello.com/c/AD6oSxeC (F0-13) — movida a **Completadas**
- **Que cambio:** la API conecta a MongoDB, verifica al arrancar que el cluster soporte
  transacciones, y `/ready` responde con un ping real. `migrate-mongo` esta configurado y la primera
  migracion crea los once indices de la spec §5.4.3. Los tests levantan su propio replica set en
  memoria. 47 tests, 99% de lineas.
- **Por que:** sin replica set no hay transacciones, y sin transacciones un webhook de cobro puede
  dejar la suscripcion a medias — alguien paga y sigue en Free. Verificarlo al arrancar, y cortar el
  proceso en un ambiente desplegado, evita descubrirlo con el primer cobro real.
- **Impacto:** **migracion nueva** (`20260907120000-indices-iniciales`). Los indices que mas
  importan y por que: los unicos de `mark`, `bowSetup` y `arrowSet` son **parciales sobre las filas
  vivas**, porque si no, borrar una marca dejaria su distancia reservada para siempre; el de `email`
  usa collation de fuerza 2, asi que `Braian@x.com` y `braian@x.com` no pueden ser dos cuentas; y el
  de `billingEvent` **es** el store de idempotencia de los webhooks — el mismo evento tres veces
  produce un solo efecto porque el segundo choca contra el indice, sin logica extra.
- **Pendiente:** los modelos de Mongoose y el repositorio que inyecta el `userId` entran en F0-15.
  El plugin que hace fallar una consulta sin contexto de usuario —la segunda capa de ADR-000— tambien.

## 2026-09-07 — F0-12: la API levanta, con su envelope y sus healthchecks

- **Modulo:** `api`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/IoF0CBse (F0-12) — movida a **Completadas**
- **Que cambio:** `apps/api` arranca sobre Hono con `/health`, `/ready`, el envelope de error
  unificado, `requestId` en cada pedido y respuesta, cabeceras de seguridad y el logger Pino con el
  formato de la spec §10.1. 32 tests, 100% de lineas y de funciones.
- **Por que:** es el piso del que cuelgan todos los modulos. El envelope y el `requestId` primero,
  antes que cualquier endpoint de negocio: agregarlos despues significa reescribir cada handler.
- **Impacto:** **codigos de error nuevos** — los seis del modulo `SYS` ya declarados en
  `docs/errors.md` quedaron implementados en `@bow-sight/types` (`SYS_ERRORS`), junto con el tipo
  `ApiErrorBody`. Ninguno sobre el modelo de datos.

  **Un hallazgo que cambio el build:** el binario compilado no arrancaba.
  `node dist/index.js` moria con `ERR_MODULE_NOT_FOUND` porque los paquetes `@bow-sight/*` publican
  TypeScript crudo, que `tsx` y Vitest transpilan al vuelo pero Node no puede cargar. Se paso de
  `tsc` a **`tsup`**, que inlinea el workspace en un solo archivo. Es la misma trampa que estaba
  anotada para `bv-bow-sight` en el plan, y aparecio recien al **correr** el build, no al leerlo.

- **Pendiente:** `/ready` devuelve `true` fijo hasta que F0-13 conecte Mongo. `/api/v1` esta montado
  y vacio: los modulos entran en F0-15. El limitador por IP y CSRF llegan con auth (F0-14).

## 2026-09-07 — F0-11: la paleta y las primitivas, con el contraste verificado

- **Modulo:** `ui`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** https://trello.com/c/1WxfwGFd (F0-11) — movida a **Completadas**
- **Que cambio:** `@bow-sight/ui` ya tiene su paleta OKLCH con tema claro y oscuro, el
  `ThemeProvider` que recuerda la eleccion en el dispositivo, y nueve primitivas accesibles:
  `Button`, `Card`, `Spinner`, `Alert`, `EmptyState`, `Field`, `Input`, `TextArea`, `Select` y
  `SegmentedControl`. 44 tests, 100% de lineas.
- **Por que:** la PWA se usa **de pie, con guantes y al sol**. El contraste y el tamaño tactil no son
  un detalle de accesibilidad en este producto: son requisitos funcionales. Todo lo tocable mide 44
  px de alto minimo.
- **Impacto:** ninguno sobre el modelo de datos. **Dos hallazgos que cambiaron la paleta:** el test
  de contraste —escrito porque `axe` saltea la regla `color-contrast` en jsdom, en silencio, por
  falta de canvas— encontro que `ink-muted` daba 3.95:1 sobre blanco y `border-strong` 2.0:1. Se
  corrigieron los tokens, no el test. Y los inputs pasaron a usar `border-strong`, porque WCAG
  1.4.11 pide 3:1 para el limite de un control.
- **Pendiente:** ninguno de esta tarjeta. Falta el `CLAUDE.md` de cada app (F0-06), que se escribe
  junto con su esqueleto.

## 2026-09-07 — F0-08: armar el tablero y cargar el backlog

- **Modulo:** `infra`
- **Tipo:** infra
- **Commit/PR:** —
- **Trello:** https://trello.com/b/BNk4csCE — 50 tarjetas cargadas
- **Que cambio:** el tablero tiene las cinco listas del metodo (`Sin iniciar`, `En proceso`,
  `Completadas`, `Canceladas`, `Bloqueadas`) y las 50 tarjetas del backlog: las 21 tareas de la Fase
  0 con su detalle, y las 29 epicas de las Fases 1 a 5 sin partir. Cada tarjeta lleva fase, puntos,
  riesgo, alcance, las reglas duras marcadas con 🔴, sus tests no negociables y el enlace a su
  entrada en `ACTION-PLAN.md`.
- **Por que:** `ACTION-PLAN.md` es la fuente de verdad del contenido y el tablero lo es del estado.
  Sin el tablero cargado, el estado de cada tarea vive en la cabeza de alguien.
- **Impacto:** ninguno sobre el codigo. Distribucion inicial: 9 en `Completadas`, 2 en `En proceso`
  (F0-06 y F0-10, ambas parciales), 38 en `Sin iniciar` y 1 en `Bloqueadas` (F0-20, esperando
  cuentas).
- **Pendiente:** 🔴 **las etiquetas hay que nombrarlas a mano.** El MCP de Trello puede adjuntar
  etiquetas pero no crearlas ni renombrarlas, asi que las seis por defecto quedaron sin nombre.
  El mapeo previsto es azul→SPEC, violeta→TECNICO, verde→API, amarillo→PWA, naranja→LANDING,
  rojo→BUG. Son seis y el metodo pide siete: `PRODUCTO` se agrega desde la UI cuando haga falta.

## 2026-09-07 — F0-09: portar el dominio matematico con sus tests intactos

- **Modulo:** `domain`
- **Tipo:** feature
- **Commit/PR:** —
- **Trello:** — (el tablero se arma en F0-08)
- **Que cambio:** `@bow-sight/domain` ya calcula marcas de mira. Los 30 tests que venian de
  `bv-bow-sight` pasan **sin haber cambiado una linea de codigo de test**, y con 19 casos borde
  nuevos la cobertura quedo en 100% de lineas y 94.8% de ramas, por encima del gate de 95/90.
- **Por que:** es el activo tecnico del producto y lo unico que la competencia no tiene (ADR-001).
  Portarlo primero y con sus tests originales es la unica forma de saber que el comportamiento no
  cambio: si un test hubiera necesitado un retoque, el retoque habria sido la señal.
- **Impacto:** ninguno sobre el modelo de datos. `LIMITS` y `ERROR_CODES`, que venian en el mismo
  `constants.ts`, **no se portaron**: son validacion y errores, y su lugar es `@bow-sight/schemas` y
  `docs/errors.md`. El dominio se queda solo con lo que usa la matematica.
- **Pendiente:** `units.ts` (F1-B), `entitlements.ts` (F2-A) y `ballistics.ts` (F4-A). Queda anotada
  en `SIGHT-MATH.md` §8 una rama muerta en `createSightModel`: `useSpline` se calcula despues de
  `fitQuadratic`, que ya lanza con menos de tres puntos, asi que su rama `false` es inalcanzable. No
  es un bug; se limpia al generalizar el modelo para unidades.

## 2026-09-07 — Crear la capa de contexto del repo

- **Modulo:** `docs`
- **Tipo:** decision
- **Commit/PR:** —
- **Trello:** —
- **Que cambio:** el repo `bow-sight-project` existe con su monorepo, su tooling y su capa de
  contexto completa: la spec, los siete ADR, `ARQUITECTURA`, `TECNICO`, `FUNCIONAL`, el diccionario
  de errores con 43 codigos, el runbook, un documento por app, `SIGHT-MATH.md`, este archivo,
  `CLAUDE.md` y el directorio `.claude/` con cuatro subagentes, cinco comandos y dos hooks.
- **Por que:** se replica el metodo de `laplace-project`, que ya esta en produccion. Sin convenciones
  escritas, cada sesion de IA inventa las suyas —razonables pero distintas entre si— y el tiempo se
  va en corregir en vez de construir. Ademas, toda regla que se puede mecanizar se mecanizo: ESLint
  bloquea los imports entre modulos y la impureza del dominio, commitlint fija el vocabulario, y el
  hook de pre-escritura bloquea secretos.
- **Impacto:** ninguno sobre el modelo de datos. Es capa de contexto, no de ejecucion. La spec define
  el modelo completo, que se implementa en F0-15.
- **Pendiente:** el tablero de Trello (F0-08), el CI (F0-19), los esqueletos de las tres apps
  (F0-12, F0-17, F0-18) y los `CLAUDE.md` por app, que se escriben junto con cada esqueleto.
