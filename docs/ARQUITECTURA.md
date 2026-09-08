# Documento de arquitectura — Bow Sight

> Como esta armado por dentro y **por que**. Las decisiones grandes viven en los ADR, que no se
> re-discuten: aca se explica como se ven en el codigo.

---

## 1. La forma general

```
┌───────────────┐   ┌───────────────┐
│    Landing    │   │      PWA      │
│     :5176     │   │     :5173     │
│  prerender    │   │ offline-first │
└───────┬───────┘   └───────┬───────┘
        └──────────┬────────┘   @bow-sight/client
             ┌─────▼─────┐
             │ API :3000 │  Hono · /api/v1/*
             └─────┬─────┘
                   │  Mongoose 8
             ┌─────▼─────┐
             │  MongoDB  │  replica set (transacciones)
             └───────────┘
```

Un solo deployable de backend. Tres procesos en total.

**Por que un monolito modular y no microservicios**: lo desarrolla una persona. Un microservicio por
modulo multiplicaria el costo de operacion sin resolver ningun problema que hoy exista.
→ [ADR-002](adr/002-monorepo.md)

**Por que la landing y la PWA estan separadas**: son dos ciclos de vida distintos. La landing es
estatica, cacheable y tiene que rankear; la PWA esta detras de login y se usa sin señal. Un cambio de
copy en el sitio no puede reiniciar la app que alguien esta usando en el campo de tiro.
→ [ADR-004](adr/004-landing-rendering.md)

## 2. Aislamiento de datos

**El dueño de los datos es el arquero.** Una base, una coleccion por entidad, un campo `userId` en
cada documento de negocio. → [ADR-000](adr/000-data-ownership.md)

### La regla

🔴 **El `userId` sale de la sesion. Nunca del body, nunca de la query, nunca de un parametro.**

Si el cliente pudiera elegir su `userId`, el aislamiento seria una sugerencia.

### Las tres capas

Ninguna alcanza sola. Las tres juntas hacen que aislar no dependa de que nadie se distraiga:

1. **El repositorio** inyecta el `userId` en toda consulta. Un controller no puede tocar el modelo
   de Mongoose: lo bloquea ESLint.
2. **Un plugin de Mongoose** es la red de seguridad: si una consulta llegara sin contexto de usuario,
   falla en vez de devolver datos de todos.
3. **Una suite parametrizada** recorre el **registro de rutas** y ataca cada una desde otro usuario.
   Una ruta nueva sin su fixture de ataque rompe el CI: no hay forma de agregar un endpoint y
   olvidarse del test.

Todo indice compuesto lleva `userId` primero.

### Cuando algo responde 404 y no 403

Pedir el recurso de otro arquero da **404**. Un 403 confirmaria que ese recurso existe, que es
justamente lo que el atacante quiere saber.

### La excepcion: compartir con coach

Es la unica lectura que cruza usuarios, y es explicita. Una consulta de lectura acepta dos caminos:
"soy el dueño" o "tengo un `share` aceptado sobre este recurso". 🔴 **Nunca habilita escritura.** Un
coach que puede corregir la marca de su atleta puede arruinarle un torneo.

### Las colecciones de plataforma

`subscription`, `billingEvent`, `idempotencyKey`, `lead` y `jobRun` **no son datos de un arquero**,
son datos sobre la operacion. Se acotan por `userId` explicito donde corresponde, que el servicio
saca de la sesion.

## 3. El dominio, aparte

```
packages/domain/src/
  ruler.ts        geometria de la regla, en milimetros enteros
  sightMarks.ts   PCHIP + parabola + residuos
  units.ts        conversion canonico <-> presentacion       (F1)
  entitlements.ts limites por plan, puros                    (F2)
  ballistics.ts   la semilla                                 (F4)
```

🔴 **Es puro**: sin I/O, sin framework, sin reloj, sin azar. Lo bloquea ESLint. Lo consumen la API,
la PWA, la **landing** (para la demo interactiva) y los tests.

Esta afuera de la API a proposito. Si viviera dentro de un modulo del backend, la demo de la landing
—que es el mejor argumento de venta que tenemos— necesitaria una llamada de red para dibujar una
curva que se calcula en un milisegundo. → [ADR-001](adr/001-empirical-first.md)

Su gate de cobertura es **95% de lineas** y sus tests portados de `bv-bow-sight` **no se modifican**:
si un test cambia, cambio el comportamiento.

## 4. Los modulos

```
apps/api/src/modules/<mod>/
  domain/          entidades, maquinas de estado, reglas puras del modulo
  application/     casos de uso: orquestan repositorios y emiten eventos
  infrastructure/  modelo de Mongoose, repositorio, rutas Hono, jobs
```

`domain/` **no conoce Mongoose ni Hono**. Ojo con la distincion: el `domain/` de un modulo son las
reglas de ese modulo (transiciones de estado, invariantes); la matematica de marcas vive en
`@bow-sight/domain`, que es otra cosa y esta un nivel mas afuera.

Los modulos: `account`, `equipment`, `sights`, `marks`, `sharing`, `billing`, `entitlements`,
`notifications`, `crm`.

### Como se hablan entre si

🔴 **Un modulo no importa nada de otro.** Lo bloquea ESLint. Hay dos caminos:

**Por puerto (interfaz).** El modulo declara que necesita y el punto de composicion le pasa quien lo
contesta. `marks` no sabe que existe `entitlements`: sabe que hay alguien que le dice si puede
escribir una marca mas.

**Por evento de dominio.** Cuando el que emite no necesita saber quien escucha ni esperar respuesta:
`mark.created`, `sight.locked`, `subscription.activated`, `share.accepted`. Un handler que falla no
tumba al que emitio.

## 5. Entitlements

Los planes son un catalogo declarativo **en codigo**, dentro de `@bow-sight/domain`.

Estan en codigo y no en la base por una razon concreta: **la PWA tiene que poder decidir si muestra
el upsell sin una llamada de red.** La misma funcion pura `can(plan, feature, usage)` la importan la
API y la PWA. El servidor es la autoridad; el cliente solo oculta.

**El enforcement va en middleware del backend.** Ocultar un boton no es una restriccion: el limite se
evalua antes de escribir, y el error dice cual es el tope y que plan lo levanta.

**Bajar de plan no borra nada.** Una funcion pura decide cuales recursos quedan activos —los mas
viejos primero— y el resto queda `locked`: legible e imprimible, no editable. Hay un endpoint para
elegir cual activar sin pagar. → [ADR-003](adr/003-payments.md)

## 6. Jobs

Cron in-process con **lock en Mongo**: sin Redis, sin servicio extra, sin costo. Cada job es
**idempotente** y deja registro de inicio, fin, duracion y error. Un job que falla en silencio es
peor que un job que no existe. La lista esta en la spec §9.

## 7. Transacciones

Procesar un webhook escribe el evento, actualiza la suscripcion y toca el plan del usuario **en la
misma transaccion**. A medias, alguien paga y sigue en Free, o deja de pagar y sigue en Max.

Por eso MongoDB tiene que ser un replica set, tambien en los tests.

## 8. El registro de rutas

Toda ruta se declara en un registro con su metodo, su path, su schema de request y response, sus
codigos de error y **su fixture de ataque** para la suite de aislamiento.

De ese mismo registro sale el OpenAPI que se publica en `/api/v1/docs`: la documentacion de la API no
se escribe aparte, asi que no puede quedar desactualizada.

## 9. Observabilidad

Pino en JSON con el formato de la spec §10.1, `requestId` en cada pedido y en cada respuesta de
error. El usuario ve el codigo y el `requestId`; con esos dos datos se encuentra que paso.

## 10. El front

Las dos apps comparten el mismo esqueleto: `@bow-sight/ui` para las primitivas, `@bow-sight/client`
para el fetch, el estado de UI y el i18n, `@bow-sight/schemas` para los tipos y las validaciones —los
mismos que usa el backend— y `@bow-sight/domain` para la matematica.

- La **landing** se prerenderiza a HTML estatico. → [ADR-004](adr/004-landing-rendering.md)
- La **PWA** es offline-first con cola de escritura. → [ADR-006](adr/006-offline-writes.md)
- Todo componente que trae datos acepta un cliente inyectable, que es lo que hace que se pueda probar
  sin levantar la API.

## 11. Las decisiones cerradas

| ADR                                 | Que cierra                                                    |
| ----------------------------------- | ------------------------------------------------------------- |
| [000](adr/000-data-ownership.md)    | El dueño de los datos es el arquero; aislamiento por `userId` |
| [001](adr/001-empirical-first.md)   | PCHIP sobre las marcas medidas; la fisica es semilla          |
| [002](adr/002-monorepo.md)          | Monorepo pnpm + Turborepo, monolito modular, tres apps        |
| [003](adr/003-payments.md)          | Suscripcion con doble pasarela detras de un adaptador         |
| [004](adr/004-landing-rendering.md) | La landing se prerenderiza con `vite-react-ssg`               |
| [005](adr/005-i18n.md)              | ES + EN desde el dia uno; la API devuelve claves              |
| [006](adr/006-offline-writes.md)    | La PWA es offline-first con cola de escritura                 |
