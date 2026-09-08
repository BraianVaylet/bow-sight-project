## Que cambia

<!-- En resultado observable, no en descripcion del diff. -->

## Tarjeta de Trello

<!-- Enlace. Si no hay tarjeta, explicar por que. -->

## Definition of Done — spec §14

- [ ] Cumple todos los criterios de aceptacion de la tarjeta
- [ ] Tests unitarios y de integracion pasando, con la cobertura de su criticidad
- [ ] **Test de aislamiento por usuario incluido** (si toca datos de un arquero)
- [ ] Si toca el dominio: **el modelo sigue pasando exacto por las marcas medidas** (ADR-001)
- [ ] Validacion Zod compartida front/back en `@bow-sight/schemas`
- [ ] Errores tipados con codigo, registrados en `docs/errors.md`
- [ ] La API devuelve **claves**, no prosa (ADR-005)
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

## Riesgo

- [ ] Toca dinero, auth, aislamiento o el dominio matematico → **requiere pasar `security-reviewer`**
      (y `domain-reviewer` si toca `packages/domain`)
