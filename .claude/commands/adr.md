---
description: Crea un ADR nuevo en docs/adr/ con el formato del proyecto
argument-hint: <decision a documentar>
---

Escribi un ADR para: **$ARGUMENTS**

1. Numeralo con el siguiente correlativo libre en `docs/adr/` (mira el directorio primero).
   Nombre: `NNN-slug-corto.md`.
2. Antes de escribir, busca en `docs/spec/BOW-SIGHT-SPEC.md` y en los ADRs existentes si la decision
   ya esta tomada o si contradice una anterior. Si la contradice, el ADR nuevo debe decir cual
   **supersede** y el viejo pasa a estado `Reemplazada por ADR-NNN`.
3. Formato, igual que los ADRs existentes:

   ```markdown
   # ADR-NNN — <titulo>

   - **Estado:** Propuesta | Aceptada | Reemplazada por ADR-NNN
   - **Fecha:** YYYY-MM-DD
   - **Spec:** <secciones relacionadas>

   ## Contexto

   El problema y las fuerzas en juego. Sin la solucion todavia.

   ## Opciones consideradas

   Al menos dos reales, con su costo. Una opcion de paja no es una opcion.

   ## Decision

   Que se hace, en presente y en imperativo. Las reglas derivadas, si las hay.

   ## Consecuencias

   Lo bueno **y lo malo**. Que se vuelve dificil a partir de ahora. Que cuesta revertir.
   ```

4. Un ADR es corto: si pasa de una carilla, probablemente sean dos decisiones.
5. Si el ADR cambia una regla que esta en `CLAUDE.md`, actualiza `CLAUDE.md` en el mismo cambio y
   agrega la entrada en `docs/BITACORA.md`.
