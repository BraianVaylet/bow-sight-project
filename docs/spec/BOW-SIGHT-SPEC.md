# [BOW SIGHT] — Spec

> **Version:** 1.0 · **Fecha:** 2026-09-07 · **Autor:** Braian Vaylet
> **Origen:** evolucion comercial de `bv-bow-sight` (app personal). Metodo copiado de
> `laplace-project`.
>
> **Regla de este documento:** es la fuente de verdad. Si algo queda fuera de spec, **primero se
> actualiza la spec, despues se codea**. Los cambios se marcan `[+]` (nuevo) y `[~]` (reescrito), y
> nada se elimina: el texto anterior se conserva.

---

## 1. Resumen

Un arquero de arco compuesto configura su mira para distintas distancias. Cada set de flechas cambia
por completo la calibracion. Hoy eso se anota en un papel pegado a la mira, y cuando el papel se
moja, se despega o el arquero cambia de flechas, hay que volver a tirar todo.

**Bow Sight** guarda esas marcas, calcula las distancias que el arquero nunca tiro, y le da una hoja
o una cinta para llevar al torneo. Se cobra por suscripcion en tres niveles.

### 1.1 Diccionario

| Termino               | Significado                                                                                                         |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Marca** (mark)      | Donde va la mira en su escala para una distancia dada, con un set de flechas dado. Es el dato central del producto. |
| **Mira** (sight)      | Una mira fisica del arquero, con su escala minima y maxima y su unidad. Un arquero puede tener varias.              |
| **Escala**            | La posicion sobre la regla de la mira. Canonico en **milimetros**; se muestra en cm, pulgadas o clicks.             |
| **Setup de arco**     | Configuracion del arco: modelo, libraje, ATA, brace height, draw length.                                            |
| **Set de flechas**    | Configuracion de flechas: spine, punta, largo, vanes, nocks. Es lo que mas cambia la calibracion.                   |
| **Ruler**             | La regla vertical en pantalla que imita la escala fisica de la mira. Pantalla estrella.                             |
| **Tape**              | La cinta adhesiva impresa a escala real que se pega a la mira.                                                      |
| **Mark Doctor**       | El analisis de residuos que señala cual marca esta probablemente mal medida.                                        |
| **Semilla balistica** | Marcas generadas desde las specs del equipo, antes de tirar. Siempre marcadas como estimadas.                       |
| **Coach**             | Alguien con acceso de **solo lectura** a un perfil de mira compartido.                                              |

### 1.2 Usuarios

| Rol       | Sigla | Donde entra | Que hace                                                      |
| --------- | ----- | ----------- | ------------------------------------------------------------- |
| Arquero   | AU    | PWA         | Todo: su equipo, sus miras, sus marcas, su suscripcion        |
| Coach     | CU    | PWA         | Ve, en solo lectura, los perfiles que un arquero le compartio |
| Visitante | VU    | Landing     | Conoce el producto, prueba la demo, se registra               |

No hay super admin ni panel de staff: es un producto B2C de autoservicio.

### 1.3 Modulos

`account` · `equipment` (arcos y sets de flechas) · `sights` · `marks` · `sharing` · `billing` ·
`entitlements` · `notifications` · `crm`.

---

## 2. Objetivo y metricas de exito

**Objetivo:** que un arquero deje de depender del papelito y este dispuesto a pagar una suscripcion
barata por no volver a perderlo.

| Metrica                           | Como se mide                                                        | Por que importa                                                                                                     |
| --------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Activacion**                    | % de registrados que cargan **5 marcas** en un mismo set de flechas | Es el umbral donde se desbloquea el calculo. Antes la app es una libreta; despues es util. Es la metrica que manda. |
| Conversion trial a pago           | % de trials de 14 dias que terminan en cobro                        | Valida el precio                                                                                                    |
| Retencion                         | Activos a 3 meses, medidos **contra el calendario de temporada**    | La arqueria tiene estacionalidad; medir por mes calendario da falsos negativos en invierno                          |
| Uso del tape                      | % de usuarios Pro que imprimen al menos una vez                     | Una de las dos features que justifican Pro                                                                          |
| Uso del corte por angulo          | % de usuarios Pro que lo usan al menos una vez                      | La otra                                                                                                             |
| Marcas corregidas por Mark Doctor | Cuantas marcas señaladas se vuelven a medir                         | Mide si el diferenciador se percibe                                                                                 |

---

## 3. Investigacion de mercado

### 3.1 Panorama competitivo

| Producto                  | Modelo          | Precio                                 | Enfoque tecnico                            |
| ------------------------- | --------------- | -------------------------------------- | ------------------------------------------ |
| Archer's Advantage        | suscripcion     | US$15/año                              | Balistica fisica, 35 años de mercado       |
| Pro Archery Ballistics    | suscripcion     | US$2.99/mes · US$14.99/año             | Balistica + IA de forma                    |
| Precision Cut Archery     | suscripcion     | US$36/año web · US$39.99 in-app        | Balistica + integracion con radar          |
| Smart Sights              | pago unico      | US$3.99 (trial 28 dias)                | Modelo fisico + angulo + reloj             |
| Archer's Mark (ULTRAVIEW) | pago unico      | US$19.99                               | Marcas + ajuste en vivo por clima y fatiga |
| Archery Sight Mark Pro    | pago unico      | —                                      | **Regresion cuadratica de 3 marcas**       |
| Artemis Premium / Coach   | suscripcion     | US$9.99 / US$11.99 año                 | Scoring y estadistica                      |
| AimTrack                  | freemium        | US$4.99 lifetime · US$2.99/mes         | Suite completa + IA                        |
| ArcheryBuddy              | freemium        | US$4.99/mes                            | IA de forma + clubes                       |
| Bat City Archery          | freemium + club | US$6.99/mes · Coach US$29 · Club US$99 | Entrenamiento + equipos                    |

**Lectura:** el techo de precio individual en marcas de mira es **US$15–40/año**. Los tiers de coach
y club aguantan de 5 a 15 veces mas. El mercado paga, pero es sensible al precio.

Tamaño: alrededor de 50 millones de practicantes en el mundo, 30 millones bajo World Archery, 25
millones en Estados Unidos. El arco compuesto es cerca del 55% del equipamiento.

### 3.2 Gaps contra la competencia

| Gap                                                 | Quien lo tiene                        | Severidad | Se cierra en          |
| --------------------------------------------------- | ------------------------------------- | --------- | --------------------- |
| Imperial (yardas y pulgadas)                        | todos                                 | 🔴 alta   | F1                    |
| Escalas no metricas (pulgadas, clicks)              | Archer's Advantage, Archer's Mark     | 🔴 alta   | F1                    |
| Corte por angulo                                    | Smart Sights, Archer's Mark, PCA      | 🔴 alta   | F1                    |
| Tape PDF a escala real con calibracion de impresora | Archer's Advantage, PCA, Smart Sights | 🔴 alta   | F1                    |
| Recuperacion por email y sync multi-dispositivo     | todos                                 | 🔴 alta   | F0                    |
| Presets de rondas (WA, NFAA, 3D)                    | Archer's Mark, AimTrack               | 🟠 media  | F1                    |
| Equipo estructurado (spine, punta, velocidad)       | todos                                 | 🟠 media  | F1                    |
| Export, backup e import                             | la mayoria                            | 🟠 media  | F1                    |
| Escritura offline                                   | varios                                | 🟠 media  | F3                    |
| Modelo balistico inicial desde specs                | Archer's Advantage, PCA               | 🟠 media  | F4                    |
| Ajuste por temperatura y altitud                    | Archer's Mark, PCA                    | 🟡 baja   | F4                    |
| i18n                                                | **ninguno**                           | —         | gap y oportunidad, F1 |

### 3.3 Ventaja competitiva

1. **Empirico primero, no fisica primero.** Pasamos exacto por lo que el arquero tiro (PCHIP
   monotono) y solo extrapolamos afuera. La competencia ajusta una curva que no pasa por ninguna
   marca, o integra una trayectoria a partir de datos que el arquero midio con una regla. Nos hace
   inmunes al modo de falla mas reportado en sus foros: un dato de velocidad mal cargado y todas las
   marcas salen mal. → ADR-001
2. **Mark Doctor.** Los residuos señalan cual marca esta probablemente mal medida y sugieren volver
   a tirar esa distancia. **Ningun competidor lo ofrece.**
3. **Hibrido semilla-a-empirico.** Tape usable el dia uno desde las specs; con cada marca real el
   peso de la fisica baja solo.
4. **Offline-first con cola de escritura.** Se usa en el campo, sin señal. → ADR-006
5. **Motor de condiciones aprendido**, no teorico: el delta observado por sesion, por arquero.
6. **ES y EN.** Todos los competidores son solo ingles. → ADR-005
7. **Plan coach.** Compartir el perfil en solo lectura. Sostiene el tier Max en un producto vertical.
8. **PWA sin store.** 0% de comision contra 15–30%, y actualizaciones instantaneas.

---

## 4. Fuera de alcance

El producto es **vertical**: marcas de mira y sight tapes. Explicitamente **no** hace, en ninguna
fase:

- Scoring, planillas de tirada ni bitacora de entrenamiento — eso es `bv-archery` (ArcherLog).
- Torneos, patrullas ni rankings — eso es `bv-easy-archery-battle` y `bv-bahia-archers-league`.
- Analisis de forma por video ni IA de tecnica.
- Tienda, venta de equipamiento ni afiliacion.
- Apps nativas de tienda. La distribucion es PWA. → ADR-004
- Red social entre arqueros.

Lo que queda para mas adelante, con su fase, esta en §12.

---

## 5. Requisitos funcionales

### 5.0 Transversales

- **Envelope de respuesta.** Exito: el recurso. Error, siempre la misma forma:

  ```json
  {
    "success": false,
    "error": {
      "code": "BS-MARK-409-002",
      "messageKey": "errors.mark.outOfScale",
      "params": { "min": 0, "max": 60 },
      "requestId": "01J9X...",
      "timestamp": "2026-09-07T14:03:11.412Z"
    }
  }
  ```

  🔴 **La API no manda prosa.** Manda `messageKey` y `params`; el idioma lo resuelve el cliente
  (ADR-005). Un mensaje en español dentro de una respuesta HTTP es un desvio de spec.

- **Paginacion** por cursor, nunca `skip`.
- **`Idempotency-Key`** obligatoria en toda mutacion sincronizable desde la cola offline y en los
  webhooks de cobro.
- **Soft delete** por defecto: `deletedAt`.
- Todo listado y todo recurso contempla **cargando, vacio, error y exito**.

### 5.1 Aplicaciones

#### 5.1.1 PWA — la app del arquero (puerto 5173)

Mobile-first, se usa **de pie, con guantes, al sol y sin señal**. Todo lo tocable mide al menos
44x44 px.

| Pantalla            | Ruta                              | Que es                                                                      |
| ------------------- | --------------------------------- | --------------------------------------------------------------------------- |
| Mis miras           | `/`                               | Las miras del arquero. Se puede fijar una como la de arranque               |
| **Mira**            | `/sights/:id`                     | **La pantalla estrella**: el ruler con las marcas, la calculadora y el tape |
| Nueva / editar mira | `/sights/new`, `/sights/:id/edit` | Nombre, escala min/max, unidad, arco y set por defecto                      |
| Equipo              | `/equipment`                      | Setups de arco y sets de flechas                                            |
| Compartido conmigo  | `/shared`                         | Los perfiles que otros arqueros le compartieron (solo lectura)              |
| Plan                | `/plan`                           | Su suscripcion, su uso contra los limites, y el portal de cobro             |
| Perfil              | `/profile`                        | Email, idioma, unidades, y sus datos                                        |

**La pantalla de la mira**, en orden:

1. Encabezado con el nombre y el arco asociado.
2. Botonera de sets de flechas, si hay marcas de mas de uno.
3. **El ruler**: regla vertical en SVG, minimo arriba, la escala crece hacia abajo. Marcas de 1 mm,
   5 mm y 1 cm, con guarda de densidad. Cada marca se ubica en su posicion exacta y muestra un chip
   de una linea con los metros y el valor de escala.
4. Los tres tipos de marca se distinguen **visualmente**: medida, calculada (punteada, con `≈`) y
   consultada (invertida). 🔴 Presentar una estimacion como medida es mentir sobre lo unico que nos
   diferencia (ADR-001).
5. Con menos de 5 marcas en el set: aviso de progreso `X/5`. Con 5 o mas: la curva, la calculadora
   de cualquier distancia, el Mark Doctor y el tape.
6. Boton de nueva marca, siempre alcanzable con el pulgar.

#### 5.1.2 Landing — el sitio publico (puerto 5176)

Prerenderizada a HTML estatico (ADR-004).

| Seccion                   | Que dice                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Demo de la regla**      | Una regla interactiva con marcas de ejemplo, corriendo en el cliente. Se ve que el modelo pasa exacto por cada marca |
| **Contra el papelito**    | Por que esto y no una cinta escrita a mano                                                                           |
| **Contra la competencia** | La comparacion, honesta y verificable: PCHIP contra regresion contra balistica                                       |
| **Precios**               | Los tres planes, **leidos de la API**: cambiar un precio no puede exigir un deploy                                   |
| **Empezar**               | Alta con 14 dias de prueba sin tarjeta                                                                               |
| **Contacto**              | Genera un lead en el CRM                                                                                             |

Mas las paginas legales: terminos, privacidad y tratamiento de datos. Rutas por idioma con
`hreflang`.

🔴 **Lo que no se puede afirmar, no se afirma.** Sin testimonios inventados ni capturas de features
que no existen.

#### 5.1.3 API (puerto 3000)

`/api/v1/*`. Fuera del prefijo: `/health` (el proceso vive) y `/ready` (vive **y** Mongo responde).
Los webhooks de cobro se montan **fuera** de `/api/v1` y fuera del limitador por IP (ADR-003).

### 5.2 Modulos

#### 5.2.1 `account`

Alta con email y contraseña por Better Auth, verificacion de email obligatoria antes de cobrar,
reset por email, cambio de email verificando **la direccion nueva** y avisando a la vieja.
Preferencias: idioma (`es` | `en`) y unidad de distancia (`m` | `yd`).

El arquero puede **descargar todo lo que guardamos de el** en JSON, en el momento, y pedir la baja.
La baja se registra con fecha; los datos se purgan a los 90 dias.

#### 5.2.2 `equipment`

**Setups de arco:** nombre, marca, modelo, libraje, ATA, brace height, draw length, notas.
**Sets de flechas:** nombre, spine, peso de punta, largo, vanes, nocks, peso total, velocidad
medida, color de vanes, notas.

🔴 Los campos son **estructurados**, no un `notes` de texto libre. Sin eso no hay semilla balistica
(F4) ni comparacion entre sets.

Borrar un setup de arco deja la mira sin arco asociado. Borrar un set de flechas **con marcas
cargadas** se bloquea con un mensaje que dice que hay que reasignarlas o borrarlas primero: evita la
perdida silenciosa de meses de datos.

#### 5.2.3 `sights`

Nombre, escala minima y maxima (**canonico en milimetros**), unidad de escala (`cm` | `in` |
`click`), tamaño del click cuando corresponde, arco asociado y set por defecto.

Estados: `active` | `locked` | `archived`. `locked` es el estado al que caen las miras que exceden
el limite del plan: **legibles e imprimibles, no editables** (ADR-003).

Reducir el rango de escala dejando marcas afuera responde 409 y dice cuantas quedarian fuera.

#### 5.2.4 `marks`

Una marca es: distancia (canonico en **metros**), valor de escala (canonico en **milimetros**), set
de flechas, origen (`measured` | `computed` | `seeded`), condiciones opcionales y notas.

- El valor de escala tiene que caer dentro de `[scaleMin, scaleMax]` de su mira.
- **Con 5 marcas medidas en un set** (`SIGHT_CALC_MIN_MARKS`) se desbloquea el calculo.
- El modelo vive en `@bow-sight/domain` y es puro: PCHIP dentro del rango medido, parabola afuera.
  🔴 `markAt(d)` devuelve **exactamente** la marca cargada en `d`, para toda marca medida (ADR-001).
- **Mark Doctor:** el residuo por marca contra la parabola. La peor se señala con su magnitud y con
  la sugerencia de volver a tirar esa distancia.
- **Corte por angulo:** `distanciaHorizontal = cos(angulo) x distanciaLineaDeVision`, y se busca la
  marca de esa distancia horizontal. El angulo entra por inclinometro o a mano.
- **Tape a escala real:** PDF generado en el cliente, milimetros a puntos con factor `72/25.4`, con
  una **barra de calibracion de 100 mm** que el arquero mide y reporta. El factor de correccion se
  guarda por usuario. Sin eso el navegador reescala en silencio y el tape sale mal, que es el dolor
  mas documentado del rubro.
- **Presets de rondas:** WA outdoor 70/50 m, WA indoor 18/25 m, NFAA Field y Hunter (11, 15, 19, 23,
  28, 32, 36, 40, 48, 53, 58 y 64 yd) y 3D marcado.

#### 5.2.5 `sharing`

Un arquero comparte **un perfil de mira** con un coach, por email. Estados: `pending` | `accepted` |
`revoked`. 🔴 **Solo lectura, siempre.** Revocar tiene efecto inmediato. Un coach que puede corregir
la marca de su atleta puede arruinarle un torneo (ADR-000).

#### 5.2.6 `billing` y `entitlements`

Suscripcion en tres planes, con trial de 14 dias **sin tarjeta**. Doble pasarela detras de un
adaptador (ADR-003). Los limites viven en codigo, en `@bow-sight/domain`, y los evalua la misma
funcion pura en el servidor y en el cliente: el servidor manda, el cliente solo oculta.

#### 5.2.7 `notifications`

Los avisos del MVP, por email: verificacion de cuenta, reset de contraseña, invitacion de coach,
trial por vencer (3 dias y 1 dia), cobro fallido y baja de plan. Cada uno se renderiza en el idioma
del usuario.

#### 5.2.8 `crm`

Los interesados que llegan por el formulario de la landing, con su estado.

### 5.3 Planes y limites

Precios anclados por debajo de Archer's Advantage (US$15/año), que es el piso del mercado.

|                            | **Free**       | **Pro** — US$1.99/mes · US$16.99/año | **Max** — US$3.99/mes · US$34.99/año |
| -------------------------- | -------------- | ------------------------------------ | ------------------------------------ |
| Miras                      | 1              | ilimitadas                           | ilimitadas                           |
| Sets de flechas            | 2              | ilimitados                           | ilimitados                           |
| Marcas por mira            | 15             | ilimitadas                           | ilimitadas                           |
| Ruler y calculadora        | si             | si                                   | si                                   |
| Unidades                   | metrico        | + imperial + clicks                  | ídem                                 |
| Hoja imprimible            | tabla basica   | **tape PDF a escala + calibracion**  | ídem                                 |
| Corte por angulo           | —              | si                                   | si                                   |
| **Mark Doctor**            | aviso generico | por marca                            | por marca                            |
| Presets de rondas          | —              | si                                   | si                                   |
| Export y backup            | —              | CSV + PDF                            | + import                             |
| Escritura offline          | —              | si                                   | si                                   |
| **Semilla balistica**      | —              | —                                    | si                                   |
| **Motor de condiciones**   | —              | —                                    | si                                   |
| Comparar sets superpuestos | —              | —                                    | si                                   |
| Historial de cambios       | —              | —                                    | si                                   |
| **Compartir con coach**    | —              | —                                    | hasta 3                              |

🔴 **Los limites se aplican en el servidor, antes de escribir.** Esconder un boton no es una
restriccion: el usuario que crea la mira 2 en Free falla con un error que dice cual es el tope y que
plan lo levanta.

🔴 **Bajar de plan no borra nada.** Lo que excede el limite queda `locked`: legible e imprimible, no
editable. Hay un endpoint para elegir cual queda activa sin pagar. Bloquear una hoja de marcas que
alguien va a usar en un torneo no es una opcion.

### 5.4 Modelo de datos

#### 5.4.1 Convenciones

- Toda coleccion de negocio lleva `userId`. **Sin excepcion.** → ADR-000
- Todo documento lleva `createdAt`, `updatedAt`, `deletedAt` (soft delete).
- IDs: **UUIDv7** generado por el cliente. Es lo que hace posible la cola offline sin reescribir ids
  (ADR-006), y ordena por tiempo de creacion sin un indice extra.
- Fechas en **UTC**, con `Temporal`. Nunca `new Date()`.
- **Distancias en metros. Escala de mira en milimetros.** Nunca se guarda un valor convertido.
- Dinero en **centavos enteros** mas `currency`. Nunca float.
- Nombres de campos y colecciones en **ingles**.

#### 5.4.2 Colecciones

```ts
// ── Identidad (Better Auth) ──────────────────────────────────────
user            { _id, email, emailVerifiedAt, name, locale, distanceUnit,
                  planCode, planValidUntil, printCalibration, createdAt }
session         { _id, userId, expiresAt, ... }        // gestionadas por Better Auth
account         { _id, userId, providerId, ... }
verification    { _id, identifier, value, expiresAt }

// ── Equipo ───────────────────────────────────────────────────────
bowSetup        { _id, userId, name, brand, model, drawWeightLb, ataIn,
                  braceHeightIn, drawLengthIn, notes, ...ts }
arrowSet        { _id, userId, name, spine, pointGrains, lengthIn, vane,
                  nock, totalGrains, speedFps, vaneColor, notes, ...ts }

// ── Miras y marcas ───────────────────────────────────────────────
sight           { _id, userId, name, scaleMinMm, scaleMaxMm, scaleUnit,
                  clickSizeMm, bowSetupId, defaultArrowSetId, status, ...ts }
mark            { _id, userId, sightId, arrowSetId, distanceM, scaleValueMm,
                  origin, conditions:{ tempC, altitudeM }, notes, ...ts }

// ── Compartir ────────────────────────────────────────────────────
share           { _id, userId, sightId, coachEmail, coachUserId, status,
                  acceptedAt, revokedAt, ...ts }

// ── Plataforma (sin userId propio) ───────────────────────────────
subscription    { _id, userId, provider, providerCustomerId,
                  providerSubscriptionId, planCode, status, currency,
                  currentPeriodEnd, cancelAtPeriodEnd, ...ts }
billingEvent    { provider, eventId, type, payload, receivedAt,
                  processedAt, error }                  // PK compuesta
idempotencyKey  { key, userId, method, route, requestHash,
                  responseStatus, responseBody, createdAt }
lead            { _id, email, message, locale, status, createdAt }
jobRun          { _id, name, startedAt, finishedAt, durationMs, error }
```

#### 5.4.3 Indices obligatorios

```js
// El userId SIEMPRE va primero en el indice compuesto (ADR-000).
sight:          { userId: 1, status: 1, updatedAt: -1 }
mark:           { userId: 1, sightId: 1, arrowSetId: 1, distanceM: 1 }
mark:           { userId: 1, sightId: 1, arrowSetId: 1, distanceM: 1 } // UNIQUE parcial sobre no borradas
arrowSet:       { userId: 1, name: 1 }
share:          { sightId: 1, coachUserId: 1, status: 1 }
subscription:   { userId: 1 }  // UNIQUE parcial sobre trialing|active|past_due
billingEvent:   { provider: 1, eventId: 1 }  // UNIQUE — es el store de idempotencia
idempotencyKey: { key: 1 }  // UNIQUE, con TTL de 24 h
user:           { email: 1 } // UNIQUE, case-insensitive
```

#### 5.4.4 Reglas de integridad

- `scaleMinMm < scaleMaxMm`, validado en la creacion y en toda edicion.
- `mark.scaleValueMm` dentro de `[sight.scaleMinMm, sight.scaleMaxMm]`, verificado leyendo la mira
  padre en la misma operacion.
- `mark.distanceM > 0` y menor o igual a 300.
- Una distancia repetida para el mismo `(sight, arrowSet)` es un conflicto explicito, no un
  duplicado silencioso: el arquero decide si reemplaza la anterior.
- Borrar un `arrowSet` con marcas responde 409.
- Borrar un `sight` borra sus marcas (soft delete en cascada).

---

## 6. Requisitos no funcionales

### 6.1 Stack

**Backend:** TypeScript `strict` · Hono · Mongoose 8 · MongoDB Atlas **con replica set** · Better
Auth · Zod 4 · Temporal · Pino · Resend.

**Frontend:** React 19 · TanStack Query/Router/Table/Form · Tailwind v4 · Zustand · Nuqs · Motion ·
i18next · `vite-react-ssg` en la landing · `vite-plugin-pwa` en la PWA.

**Testing:** Vitest 4 · Testing Library · MSW · `mongodb-memory-server` · Playwright.

**Tooling:** pnpm 11 + Turborepo 2 · ESLint + Prettier · husky + lint-staged · migrate-mongo.

**Infra:** Railway, un servicio por app.

### 6.2 Arquitectura

Monolito modular. `apps/api/src/modules/<mod>/{domain,application,infrastructure}`. `domain/` no
conoce Mongoose ni Hono. Un modulo **no importa nada de otro**: se hablan por interfaz o por evento
de dominio, y lo bloquea ESLint. → ADR-002

`@bow-sight/domain` es un paquete aparte, **puro**: sin I/O, sin framework, sin reloj, sin azar. Lo
consumen la API, la PWA, la landing y los tests. → ADR-001

Frontera de estado en el front: **Query = servidor · Zustand = UI · Nuqs = filtros urleables.**
Nunca duplicar estado de servidor en Zustand.

### 6.3 Buenas practicas

- Sin `any`, sin `console.log`, sin TODOs sueltos.
- Sin logica de negocio en componentes React.
- Todo componente que trae datos acepta un cliente inyectable: es lo que permite probarlo sin
  levantar la API.
- El reloj se **inyecta** (`now: () => Temporal.Instant`). Sin eso no se puede probar el vencimiento
  de un trial sin esperar catorce dias.
- Commits convencionales con el scope de `commitlint.config.js`.

### 6.4 Buenas practicas con IA

- **`CLAUDE.md` es el contrato**, en la raiz y uno por app. Si una regla no esta ahi, cada sesion
  inventa la suya.
- Los subagentes de `.claude/agents/` tienen roles cerrados: `spec-reviewer` no busca bugs,
  `security-reviewer` no propone refactors, `domain-reviewer` solo cuida la matematica.
- `.claude/commands/` para lo repetitivo: `/adr`, `/bitacora`, `/new-module`, `/new-task`,
  `/trello-sync`.
- **Toda regla que se pueda mecanizar, se mecaniza.** ESLint bloquea los imports entre modulos y la
  impureza del dominio; commitlint fija el vocabulario; el hook de pre-escritura bloquea secretos;
  el CI aplica el gate de cobertura. Una regla que solo vive en un documento se incumple.
- Escribir en `docs/spec/**` y en `packages/domain/src/**` **pide confirmacion**: son las dos cosas
  que no se tocan al pasar.

### 6.5 Testing

Unitarios junto al codigo (`*.test.ts`), integracion en `apps/api/tests/`, e2e en `e2e/`. La
integracion levanta un **replica set en memoria**: las transacciones no existen sin el.

**Los siete tests que no se negocian:**

1. **Aislamiento por usuario**, una vez por endpoint, recorriendo el registro de rutas. Una ruta
   nueva sin su fixture de ataque rompe el CI.
2. **El modelo pasa exacto por cada marca medida.** Es la promesa del producto (ADR-001).
3. **Idempotencia de webhooks:** el mismo evento tres veces produce un solo efecto.
4. **Limite de plan:** la mira 2 en Free falla con su codigo.
5. **Downgrade con exceso:** bajar con 6 miras deja 1 activa y 5 bloqueadas, sin borrar ninguna.
6. **Unidades ida y vuelta sin perdida**, en los dos sistemas y en las tres escalas.
7. **Cola offline:** crear sin conexion, reconectar, verificar en el servidor, sin duplicados.

**Cobertura por criticidad**, aplicada por el CI:

| Zona                                       | Minimo |
| ------------------------------------------ | ------ |
| `@bow-sight/domain`, entitlements, billing | 95%    |
| Marcas, unidades, auth, sharing            | 85%    |
| Notificaciones, CRM                        | 70%    |
| UI generica, landing                       | 50%    |

Global 80% o mas.

### 6.6 UX / UI

- **Mobile-first.** La PWA se usa de pie, con una mano, con guantes. Todo lo tocable mide 44x44 px.
- **Sensacion de instantaneo.** Las acciones sobre marcas son optimistas, con vuelta atras y el
  mensaje del error tipado. Frenar el entrenamiento es el peor pecado del producto.
- **Dark y light**, verificados los dos. Se usa al sol.
- Accesible: teclado, foco visible, contraste, labels. Toda accion de arrastrar tiene equivalente
  por teclado.
- Responsive verificado en 360, 768 y 1440.
- **Medido y estimado se distinguen siempre**, en pantalla y en papel.

### 6.7 Infra

Railway, tres servicios por ambiente (`staging` y `prod`), cada uno con su `railway.json`.
Healthcheck de la API en `/ready`, no en `/health`: un servicio que responde pero no puede leer nada
no esta listo para recibir trafico.

MongoDB Atlas con replica set, backups automaticos y PITR. **Prohibido tocar Atlas a mano**: lo que
se hizo a mano en un ambiente no existe en el otro. Las migraciones corren **antes** del deploy y
desde un solo lugar.

---

## 7. Aislamiento de datos

**El dueño de los datos es el arquero.** → ADR-000

🔴 **El `userId` sale de la sesion. Nunca del body, nunca de la query, nunca de un parametro.**

Tres capas, porque ninguna alcanza sola:

1. **El repositorio** inyecta el `userId` en toda consulta. Un controller no puede tocar el modelo
   de Mongoose: lo bloquea ESLint.
2. **Un plugin de Mongoose** es la red de seguridad: una consulta sin contexto de usuario falla en
   vez de devolver datos de todos.
3. **Una suite parametrizada** recorre el registro de rutas y ataca cada una desde otro usuario.

Todo indice compuesto lleva `userId` primero. Pedir un recurso ajeno responde **404**, no 403.

**La lectura compartida** es la unica excepcion, y es explicita: una consulta de lectura acepta "soy
el dueño" o "tengo un `share` aceptado sobre este recurso". Nunca habilita escritura.

---

## 8. Seguridad y privacidad

### 8.1 Aplicacion

- Contraseñas con el hashing de Better Auth. Nunca en logs.
- Rate limit en login, registro, recupero y verificacion. **Los webhooks quedan afuera**: Stripe
  reintenta desde IPs rotativas y un 429 marca el endpoint como caido.
- Zod en el borde de toda entrada. Ningun objeto del usuario va directo a un `find`.
- Headers: CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`. CORS por origen explicito, sin
  comodines.
- Cookies `httpOnly`, `Secure` y **`SameSite=Lax`** — `Strict` rompe el regreso de Checkout y del
  `back_url` de Mercado Pago (ADR-003).
- Los datos de tarjeta **nunca** tocan Bow Sight: tokenizacion del lado del proveedor.
- Secretos en Railway, jamas en el repo. El hook de pre-escritura los bloquea.

### 8.2 Datos personales

Bow Sight guarda poco y sensible nada: email, nombre opcional, y datos de equipo y marcas. No hay
datos de salud, ni ubicacion, ni fotos de personas.

- **Descargar mis datos**: todo, en JSON, en el momento. Un resumen elegido por nosotros no cumple
  el derecho de acceso.
- **Pedir la baja**: se registra con fecha, se ejecuta a los 90 dias, y la pantalla dice por que no
  es inmediata.
- Las marcas de un arquero **no se usan para nada agregado** sin consentimiento explicito.

---

## 9. Jobs

Cron in-process con lock en Mongo: sin Redis, sin servicio extra, sin costo. Cada job es
**idempotente** y deja registro de inicio, fin, duracion y error en `jobRun`.

| Job                      | Cuando | Que hace                                            |
| ------------------------ | ------ | --------------------------------------------------- |
| `expireTrials`           | diario | Cierra los trials vencidos. **Suspende, no borra**  |
| `notifyExpiringTrials`   | diario | Avisa 3 y 1 dias antes                              |
| `dunning`                | diario | Reintentos y avisos de cobro fallido                |
| `applyPendingDowngrades` | diario | Aplica las bajas de plan al terminar el ciclo       |
| `purgeIdempotencyKeys`   | diario | Limpia las claves vencidas                          |
| `purgeDeletedAccounts`   | diario | Purga las cuentas dadas de baja hace mas de 90 dias |
| `reconcileSubscriptions` | diario | Compara el estado local contra el del proveedor     |

---

## 10. Observabilidad y errores

### 10.1 Formato de log

Pino en JSON, el mismo en todos lados:

```json
{
  "ts": "2026-09-07T14:03:11.412Z",
  "level": "error",
  "env": "prod",
  "service": "api",
  "module": "marks",
  "action": "createMark",
  "requestId": "01J9X...",
  "userId": "018f...",
  "durationMs": 42,
  "errorCode": "BS-MARK-409-002",
  "msg": "mark outside sight scale",
  "meta": {}
}
```

**Nunca se loguean** contraseñas, tokens ni datos de tarjeta. Ni en `meta`.

### 10.2 Codigos de error

Formato `BS-<MODULE>-<HTTP>-<NNN>`. El diccionario completo esta en `docs/errors.md`. **Declarar los
codigos nuevos es parte del Definition of Ready:** una tarea no arranca sin sus codigos declarados.

### 10.3 Alertas

5xx por encima del 1% en 5 minutos · job fallido · webhook sin procesar por mas de 15 minutos ·
uptime externo sobre `/ready` y sobre la landing. Externo y no interno: si el servicio se cae, un
monitor que vive adentro se cae con el.

---

## 11. Roadmap por fases

🔴 **Regla de corte:** ninguna fase arranca sin que la anterior este en produccion y usada por gente
real. Detallar hoy lo que se va a construir dentro de seis meses es trabajo que se tira.

**Fase 0 — Fundaciones.** Monorepo, tooling, CI, los documentos, los ADRs, el tablero. MongoDB con
migraciones, Better Auth con email y verificacion, Railway con staging y prod. **Portar
`@bow-sight/domain` con su cobertura intacta.** Esqueletos de las tres apps. Migracion de los datos
reales del autor.

**Fase 1 — Paridad competitiva.** i18n ES/EN completo. Unidades canonicas con imperial y escalas en
pulgadas y clicks. Tape PDF a escala real con calibracion. Corte por angulo con inclinometro. Mark
Doctor por marca. Presets de rondas. Export CSV y PDF. Equipo estructurado.

**Fase 2 — Monetizacion.** Entitlements con su catalogo y su middleware. Stripe y Mercado Pago
detras de sus adaptadores, con webhooks idempotentes. Trial de 14 dias sin tarjeta. Landing con
precios y checkout. Dunning y gracia.

**Fase 3 — Offline-first.** Cola de escritura en la PWA, ids del cliente, idempotencia en el
servidor y deteccion de escritura obsoleta. Se hace **despues** de que el formato del wire este
congelado por F1 y F2.

**Fase 4 — Diferenciacion.** Semilla balistica (RK4 mas busqueda binaria sobre el angulo de
lanzamiento: con arrastre no hay solucion cerrada). Motor de condiciones aprendido. Comparacion de
sets superpuestos. Historial de cambios. Compartir con coach.

**Fase 5 — Salida al mercado.** Landing auditada, legales, Sentry, analytics cookieless, backups con
restore probado. Lanzamiento: primero el CBA y la liga bahiense, despues ArcheryTalk y r/Archery.

---

## 12. Riesgos y decisiones abiertas

### 12.1 Riesgos

| Riesgo                                   | Prob. | Impacto | Mitigacion                                                                                                                |
| ---------------------------------------- | ----- | ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Nadie paga porque lo gratis alcanza      | media | alto    | Trial de 14 dias con todo; Free queda en 1 mira. Cualquiera con dos arcos o dos sets choca el limite en la primera semana |
| Cobrar desde Argentina                   | alta  | alto    | Adaptador por proveedor, para cambiar a un Merchant of Record sin reescribir el billing (ADR-003)                         |
| Portar el math y romperlo                | baja  | critico | Se porta en F0 **con sus tests actuales sin modificar**. Si un test cambia, cambio el comportamiento                      |
| El i18n toca todo                        | media | medio   | Se hace en F1, antes de que existan features nuevas. Claves tipadas: una clave inventada es error de compilacion          |
| La cola offline introduce conflictos     | media | alto    | Se hace ultimo, con el wire congelado. Concurrencia optimista explicita, nunca last-write-wins silencioso                 |
| Alcance vertical, mercado chico          | alta  | medio   | Decision tomada. Se compensa con precio bajo, volumen global y el tier Max sostenido por el coach                         |
| Activacion baja: pocos llegan a 5 marcas | media | alto    | La semilla balistica de F4 ataca justo esto. Se mide desde el dia uno                                                     |

### 12.2 Decisiones abiertas

1. **Merchant of Record.** Confirmar antes de escribir el adaptador de Stripe si conviene Lemon
   Squeezy o Paddle. → ADR-003 lo deja explicitamente evaluado y listo para reemplazar.
2. **Portugues.** Preparado por ADR-005 pero no abierto. Se decide con datos de trafico.
3. **Reloj o widget.** Smart Sights tiene Apple Watch y Wear OS; una PWA no puede. Se evalua despues
   de F5 si aparece demanda.

---

## 13. Glosario de estados

```
sight         : active | locked | archived
subscription  : trialing | active | past_due | canceled | paused | incomplete
share         : pending | accepted | revoked
mark.origin   : measured | computed | seeded
lead          : new | contacted | converted | discarded
```

🔴 Los estados se cambian **solo** mediante transiciones explicitas y validadas. Nunca con un
`update` libre del campo.

---

## 14. Criterios de aceptacion transversales (DoR / DoD)

**Definition of Ready** — una tarea puede empezar si tiene:

- [ ] Titulo, descripcion y modulo
- [ ] Criterios de aceptacion verificables (Given/When/Then)
- [ ] Ejemplo concreto de uso, con datos reales
- [ ] Story points y dependencias declaradas
- [ ] Impacto en el modelo de datos identificado
- [ ] **Codigos de error nuevos declarados en `docs/errors.md`**

**Definition of Done** — una tarea esta terminada si:

- [ ] Cumple todos los criterios de aceptacion
- [ ] Tests unitarios y de integracion pasando, con la cobertura de su criticidad
- [ ] **Test de aislamiento por usuario incluido** (si toca datos de un arquero)
- [ ] Si toca el dominio: **el test de que el modelo pasa exacto por las marcas medidas** sigue verde
- [ ] Validacion Zod compartida front/back en `@bow-sight/schemas`
- [ ] Errores tipados con codigo, registrados en `docs/errors.md`
- [ ] Logs estructurados en las rutas criticas
- [ ] Estados vacio, de carga y de error implementados
- [ ] Accesible: teclado, foco visible, contraste, labels
- [ ] Responsive verificado (360 / 768 / 1440)
- [ ] Dark y light verificados
- [ ] **ES y EN completos** — ningun string hardcodeado
- [ ] Documentacion y OpenAPI actualizados
- [ ] Entrada en `docs/BITACORA.md` con commit/PR y tarjeta
- [ ] Sin `any`, sin `console.log`, sin TODOs sueltos
- [ ] Desplegado en staging y probado a mano
- [ ] **Tarjeta movida en Trello**

---

_Fin de la spec v1.0 — documento vivo. Cada cambio se registra en `docs/BITACORA.md`._
