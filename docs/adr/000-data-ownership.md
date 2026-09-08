# ADR-000 — El dueño de los datos es el arquero

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §1, §5.2, §8

## Contexto

Bow Sight guarda las marcas de mira de una persona: donde va su mira, a que distancia, con que set
de flechas. Es informacion que cuesta meses de entrenamiento y que decide como tira en un torneo.

El producto de referencia del que se copia el metodo, Laplace, es multi-tenant B2B: el tenant es una
organizacion y cada dato lleva su `tenantId`. Bow Sight es B2C. Hay que decidir cual es la frontera
de aislamiento antes de escribir la primera consulta, porque despues cambiarla implica migrar todos
los indices.

La tension: el tier Max promete **compartir el perfil de mira con un entrenador**. Un modelo de
aislamiento que no contemple eso desde el principio termina resolviendolo con un parche.

## Opciones consideradas

1. **Copiar el modelo de organizacion de Laplace.** Cada arquero seria una organizacion de un solo
   miembro y el coach se sumaria como miembro. Es coherente con Better Auth (que trae el plugin
   `organization`), pero mete un nivel de indireccion en cada consulta para un producto donde el
   99% de los usuarios nunca va a tener una organizacion. Ademas invita a que un coach termine con
   permiso de escritura sobre datos que no son suyos, solo por ser miembro.
2. **Aislamiento por `userId`, con una tabla de compartir aparte.** Cada documento de negocio lleva
   el `userId` de su dueño. Compartir es un registro explicito, con su propio estado y su propia
   revocacion, que solo concede **lectura**.

## Decision

**Opcion 2.** El dueño de los datos es el arquero.

- Todo documento de negocio lleva `userId`, y el `userId` **sale de la sesion**: nunca del body, ni
  de la query, ni de un header. Si el cliente pudiera elegir su `userId`, el aislamiento seria una
  sugerencia.
- Todo indice compuesto lleva `userId` **primero**.
- Un controller no toca el modelo de Mongoose: pasa por el repositorio, que inyecta el `userId`.
  Lo bloquea ESLint.
- Pedir un recurso ajeno devuelve **404, no 403**. Un 403 confirma que ese recurso existe, que es
  justamente lo que el atacante quiere saber.
- **Compartir con coach** es una entidad propia (`Share`) con estados `pending | accepted | revoked`.
  Concede **solo lectura** sobre un perfil de mira concreto, es revocable con efecto inmediato, y
  jamas habilita una escritura. Un coach que puede corregir la marca de su atleta puede arruinarle
  un torneo.

## Consecuencias

- Una suite parametrizada recorre el **registro de rutas** y ataca cada una desde otro usuario. Una
  ruta nueva sin su fixture de ataque rompe el CI: no hay forma de agregar un endpoint y olvidarse
  del test.
- Las colecciones de plataforma (`subscriptions`, `billingEvents`, `leads`, `idempotencyKeys`) **no
  llevan `userId`** a proposito: no son datos _de_ un arquero, son datos _sobre_ la operacion. Se
  acotan por `userId` explicito donde corresponde, que el servicio saca de la sesion.
- La lectura compartida obliga a que toda consulta de lectura acepte dos caminos: "soy el dueño" o
  "tengo un `Share` aceptado sobre este recurso". Es mas codigo que un solo `where`, y es el precio
  de que el coach exista sin agujerear el aislamiento.
- Si algun dia hay planes de club con varios arqueros, esto se revisa: el modelo de organizacion
  vuelve a estar sobre la mesa. Hoy seria complejidad pagada por adelantado.
