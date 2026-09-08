---
description: Agrega una entrada a docs/BITACORA.md a partir de los cambios recientes
argument-hint: [titulo de la entrada] (opcional)
allowed-tools: Bash(git log:*), Bash(git diff:*), Bash(git status:*), Read, Edit
---

Agrega una entrada nueva a `docs/BITACORA.md`. Titulo sugerido: $ARGUMENTS

1. Mira `git log` y `git diff` para saber que cambio realmente. No lo asumas.
2. Usa exactamente el formato definido al principio de `docs/BITACORA.md`.
3. Inserta la entrada **arriba de todo** (mas nuevo primero), debajo del bloque de formato.
4. **Que cambio** se escribe en resultado observable, no en descripcion del diff.
   Mal: "se agrego el metodo createMark al servicio".
   Bien: "el arquero ya puede cargar una marca desde la PWA y verla sobre la regla".
5. **Por que** es el motivo de negocio o tecnico, no la repeticion del titulo.
6. Completa `Impacto` con: modelo de datos / API / migracion / codigos de error nuevos, o `ninguno`.
7. Si hay commit o PR, referencialo. Si conoces la tarjeta de Trello, enlazala; si no, deja `—`.
8. No inventes tarjetas, PRs ni fechas. Lo que no sabes va como `—`.
