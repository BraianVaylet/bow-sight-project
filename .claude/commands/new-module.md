---
description: Arranca un modulo nuevo del backend con la estructura, los tests y los codigos de error que exige la spec
argument-hint: <nombre-del-modulo> (ej: marks)
---

Arranca el modulo `$ARGUMENTS` de Bow Sight. **En este orden, sin saltear pasos.**

1. **Lee la spec.** Busca `$ARGUMENTS` en `docs/spec/BOW-SIGHT-SPEC.md` y en `docs/adr/`. Lista los
   requisitos que aplican y los estados del modulo. Si algo es ambiguo, pregunta antes de escribir
   codigo — la spec se actualiza primero.

2. **Declara los codigos de error** del modulo en `docs/errors.md`, con su HTTP, significado y clave
   de mensaje. Es parte del Definition of Ready.

3. **Escribi primero los tests** (usa el subagente `test-writer`), contra una API que todavia no
   existe. Obligatorios: aislamiento por usuario, el camino feliz, y los casos de error con su
   codigo exacto. Si el modulo toca limites de plan: el test del recurso N+1. Si toca dinero o
   webhooks: idempotencia.

4. **Estructura.** Crea `apps/api/src/modules/$ARGUMENTS/{domain,application,infrastructure}`:
   - `domain/`: entidades, maquina de estados, reglas de negocio puras. Sin Mongoose, sin Hono.
   - `application/`: casos de uso. Orquestan repositorios y emiten eventos de dominio.
   - `infrastructure/`: modelo de Mongoose, repositorio con inyeccion de `userId`, rutas Hono.

   La matematica de marcas **no va aca**: vive en `@bow-sight/domain` y es pura (ADR-001).

5. **Schemas Zod** en `packages/schemas/src/$ARGUMENTS/`. Fuente unica front y back. Los tipos salen
   de `z.infer`, no se escriben a mano.

6. **Contratos hacia afuera.** El modulo se expone por interfaz o por evento de dominio. Prohibido
   importar el modelo de otro modulo — lo bloquea ESLint.

7. **Registra la ruta** con su schema, sus codigos de error y **su fixture de ataque** para la suite
   de aislamiento. Sin el fixture, el CI no compila esa suite y falla.

8. Al terminar, pasa el subagente `spec-reviewer`, escribi la entrada en `docs/BITACORA.md` y move
   la tarjeta en Trello.
