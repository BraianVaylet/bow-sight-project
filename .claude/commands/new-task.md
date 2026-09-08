---
description: Redacta una tarea de Bow Sight con el formato de la spec y la deja lista para Trello
argument-hint: <descripcion corta de la tarea>
---

Redacta la tarea: **$ARGUMENTS**

Usa el formato de tarea de la spec. Salida en Markdown, lista para pegar en Trello (tablero
bow-sight: https://trello.com/b/BNk4csCE).

```
title:               imperativo, en español, 70 caracteres o menos
module:              modulo de la spec (o infra / docs)
description:         que y para quien. En resultado observable, no en implementacion.
acceptance-criteria: lista Given/When/Then, verificables. Cada una testeable por separado.
example:             un caso concreto con datos reales (distancias, marcas, nombres)
story-points:        Fibonacci 1/2/3/5/8/13
depends_on:          [otras tareas o modulos que deben existir antes]
risk:                low | med | high
test_plan:           que tests la cubren y de que tipo (unit / integracion / e2e)
error-codes:         codigos nuevos BS-<MOD>-<HTTP>-<NNN> que introduce, o ninguno
data-model-impact:   colecciones o campos nuevos, migracion requerida, o ninguno
```

Reglas:

- **Toda tarea de mas de 8 puntos se parte** antes de empezar. Si te da 13, devolve la particion en
  tareas de 8 o menos, no la tarea gigante.
- Antes de estimar, verifica el Definition of Ready: sin criterios verificables, sin ejemplo, sin
  dependencias declaradas y sin codigos de error definidos, la tarea **no esta lista**. Decilo.
- Si toca dinero, auth, aislamiento por usuario o el dominio matematico, entonces `risk: high` y el
  `test_plan` incluye el test de aislamiento si o si.
- Si toca `packages/domain`, el `test_plan` incluye el test de que el modelo pasa exacto por las
  marcas medidas (ADR-001).
- Chequea contra el roadmap de la spec que la tarea corresponda a la fase en curso. Si es de una
  fase posterior, decilo en vez de redactarla.
