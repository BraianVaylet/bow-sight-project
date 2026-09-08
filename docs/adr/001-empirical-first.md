# ADR-001 — Empirico primero: PCHIP sobre las marcas medidas

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §0.1, §2.1, §5.2

## Contexto

Toda app de marcas de mira resuelve el mismo problema: el arquero tiro a cinco distancias y quiere
saber donde poner la mira a las otras cuarenta.

El mercado lo resuelve de dos formas. **Balistica pura** (Archer's Advantage, Precision Cut Archery,
Pro Archery Ballistics): se cargan velocidad, peso de flecha, geometria de la mira, y el software
integra la trayectoria. **Regresion cuadratica** de tres marcas (Archery Sight Mark): se ajusta una
parabola por minimos cuadrados.

Las dos tienen el mismo defecto y esta documentado en los foros: **la curva no pasa por las marcas
que el arquero realmente tiro**. En la balistica pura, un dato de velocidad mal medido desplaza todo
el tape; es la queja mas repetida sobre esos productos. En la regresion, la parabola queda cerca de
los tres puntos pero no toca ninguno.

Para un arquero, una marca medida no es un dato mas: es la verdad. La tiro el, con su arco, ese dia.

## Opciones consideradas

1. **Balistica pura.** Precisa si los datos de entrada son precisos, y con la ventaja de servir
   desde el dia cero sin tirar una flecha. Depende de medir velocidad con cronografo y geometria con
   regla, y el error de entrada se propaga a todas las distancias.
2. **Regresion cuadratica global.** Simple, robusta al ruido y extrapola bien. No pasa por ningun
   punto medido, lo que la vuelve imposible de defender frente a un arquero que sabe donde tiro.
3. **Spline cubico monotono (PCHIP, Fritsch–Carlson) dentro del rango medido, parabola de minimos
   cuadrados solo afuera.** Pasa exacto por cada marca, es suave, y por construccion no decrece ni
   sobrepasa entre puntos.

## Decision

**Opcion 3.** El modelo es empirico primero.

- **Dentro del rango medido:** PCHIP. Pasa exacto por cada marca. La monotonia de Fritsch–Carlson
  garantiza que el spline no sobrepase entre dos marcas: un overshoot mandaria al arquero a poner la
  mira en un lugar donde nunca tiro.
- **Fuera del rango medido:** parabola de minimos cuadrados, resuelta por Cramer. Sirve para la de
  sala (18 m) y para las distancias largas. Se marca explicitamente como **estimada**, nunca se
  presenta como medida.
- **La fisica es semilla, nunca autoridad.** El modelo balistico (Max) genera un tape usable el dia
  uno; en cuanto entra una marca medida en ese tramo, la marca manda y la fisica se corre.
- **Control de calidad:** los residuos de la parabola exponen cual marca es probablemente un error
  de medicion. Eso es el **Mark Doctor**, y es la unica feature de este tipo en el mercado.
- Todo esto vive en `@bow-sight/domain` como funciones **puras**: sin I/O, sin framework, sin reloj,
  sin azar. Lo consumen la API, la PWA, la landing y los tests.

## Consecuencias

- **El modelo necesita marcas para servir.** Con menos de cinco no se desbloquea el calculo, y eso
  es un costo real de activacion. Se compensa con la semilla balistica del tier Max y midiendo el
  porcentaje de usuarios que llegan a cinco marcas como metrica de activacion.
- **Test obligatorio y permanente:** `markAt(d)` devuelve exactamente la marca cargada en `d`, para
  toda marca medida. Si un refactor lo rompe, tiene que romper un test. Es la promesa del producto.
- La cobertura de `@bow-sight/domain` es **95% de lineas**, aplicada por el CI. Los tests portados
  desde `bv-bow-sight` no se modifican: si un test cambia, cambio el comportamiento.
- PCHIP necesita al menos tres puntos distintos. Las distancias repetidas se colapsan promediando
  antes de ajustar, porque si no el spline divide por cero.
- Es el argumento de venta: _pasa exacto por las marcas que tiraste; los demas te ajustan una curva
  que no pasa por ninguna_. Obliga a que la UI **distinga visualmente** medido de estimado en todas
  las superficies, incluida la hoja impresa. Presentar una estimacion como medida seria mentir sobre
  lo unico que nos diferencia.
