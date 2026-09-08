# Bow Sight 🎯

App de **marcas de mira** para arqueros. El arquero registra en que punto de la escala va su mira a
cada distancia, y la app calcula las distancias que nunca tiro. Reemplaza el papelito pegado a la
mira.

Producto por suscripcion en tres niveles (Free / Pro / Max), en español e ingles, distribuido como
PWA.

> Evolucion comercial de [`bv-bow-sight`](https://github.com/BraianVaylet/bv-bow-sight), que queda
> congelado como app personal.

---

## Que lo hace distinto

La competencia calcula tus marcas de dos formas: integrando la trayectoria desde las specs de tu
equipo, o ajustando una parabola a tres mediciones. Las dos comparten el mismo defecto: **la curva no
pasa por las marcas que tiraste**.

Bow Sight usa un spline cubico monotono (PCHIP) que **pasa exacto por cada marca medida** y solo
extrapola fuera del rango, marcando lo extrapolado como estimado. Y usa los residuos de ese ajuste
para señalar cual de tus marcas esta probablemente mal medida — el **Mark Doctor**, que no tiene
ningun competidor.

Detalle en [`docs/domain/SIGHT-MATH.md`](docs/domain/SIGHT-MATH.md) y
[`docs/adr/001-empirical-first.md`](docs/adr/001-empirical-first.md).

## Arrancar

```bash
corepack enable && pnpm install
cp .env.example .env    # completar MONGODB_URI y BETTER_AUTH_SECRET
pnpm exec migrate-mongo up
pnpm dev
```

| App     | Puerto |
| ------- | ------ |
| api     | 3000   |
| pwa     | 5173   |
| landing | 5176   |

El paso a paso completo, con requisitos y comandos, esta en [`docs/TECNICO.md`](docs/TECNICO.md).

## Estructura

```
apps/      api · pwa (app del arquero) · landing (sitio publico)
packages/  domain (math puro) · schemas (Zod) · types · ui · client · config
docs/      spec, ADRs, arquitectura, tecnico, funcional, errores, runbook, bitacora
```

## Documentacion

| Documento                                                    | Para que sirve                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| [`docs/spec/BOW-SIGHT-SPEC.md`](docs/spec/BOW-SIGHT-SPEC.md) | **La fuente de verdad.** Si algo queda fuera de spec, primero se actualiza la spec |
| [`docs/FUNCIONAL.md`](docs/FUNCIONAL.md)                     | Que hace el producto, sin implementacion                                           |
| [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)               | Aislamiento, modulos, eventos, jobs                                                |
| [`docs/TECNICO.md`](docs/TECNICO.md)                         | Stack, como levantarlo, convenciones                                               |
| [`docs/domain/SIGHT-MATH.md`](docs/domain/SIGHT-MATH.md)     | La matematica de las marcas                                                        |
| [`docs/errors.md`](docs/errors.md)                           | El diccionario de codigos de error                                                 |
| [`docs/ACTION-PLAN.md`](docs/ACTION-PLAN.md)                 | El backlog, con lo hecho y lo que falta                                            |
| [`docs/BITACORA.md`](docs/BITACORA.md)                       | Que cambio, cuando y por que                                                       |
| [`docs/runbook-staging.md`](docs/runbook-staging.md)         | Deploy, backups y vuelta atras                                                     |
| [`docs/adr/`](docs/adr/)                                     | Las decisiones cerradas, que no se re-discuten                                     |
| [`docs/apps/`](docs/apps/)                                   | Un documento por aplicacion                                                        |

Si vas a trabajar en este repo con Claude Code, [`CLAUDE.md`](CLAUDE.md) es el contrato de
convenciones.

**Tablero:** https://trello.com/b/BNk4csCE

## Licencia

MIT
