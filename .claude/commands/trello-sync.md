---
description: Sincroniza docs/ACTION-PLAN.md con el tablero de Trello del proyecto
argument-hint: [fase a sincronizar, ej: F1] (opcional; por defecto la fase en curso)
---

Sincroniza el backlog con el tablero **bow-sight**: https://trello.com/b/BNk4csCE

Fase: $ARGUMENTS (si viene vacio, usa la fase en curso segun `docs/ACTION-PLAN.md`).

1. **Lee primero, escribi despues.** Trae las listas y las tarjetas actuales del tablero con el MCP
   de Trello. Nunca crees una tarjeta sin haber verificado que no existe: los duplicados en un
   tablero son peores que una tarjeta faltante.

2. **Estructura esperada del tablero.** Listas: `Sin iniciar`, `En proceso`, `Completadas`,
   `Canceladas`, `Bloqueadas`. Etiquetas: `SPEC`, `TECNICO`, `PRODUCTO`, `BUG`, `API`, `PWA`,
   `LANDING`. Si falta alguna, crea solo lo que falta.

3. **Formato de tarjeta**, identico para todas:

   ```
   Nombre:  F1-07 · Mark Doctor: residuo por marca

   Desc:    **Fase 1 — Paridad competitiva** · ~8 puntos · **Riesgo:** bajo

            **Alcance**
            - ...

            🔴 Regla dura, si la hay.

            **Tests no negociables:** ...

            Detalle: docs/ACTION-PLAN.md → F1-07 · Decision: docs/adr/001-empirical-first.md
   ```

   Las epicas llevan `[Epica]` en el nombre y no se parten hasta que su fase se abre.

4. **Direccion de la sincronizacion.** `docs/ACTION-PLAN.md` es la fuente de verdad del contenido;
   Trello es la fuente de verdad del **estado**. Si difieren en el contenido, gana el plan de
   accion. Si difieren en el estado, gana el tablero.

5. Al terminar, informa: tarjetas creadas, actualizadas y las que quedaron fuera de sincronia con el
   motivo. No muevas una tarjeta a `Completadas` por tu cuenta: eso lo hace quien termina la tarea,
   cuando cumple el Definition of Done.
