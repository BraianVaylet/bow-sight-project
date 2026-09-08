# La matematica de las marcas

> Que hace `@bow-sight/domain`, por que lo hace asi, y que no se puede tocar.
>
> Es el activo tecnico del producto: lo unico que la competencia no tiene. No puede vivir solo en el
> codigo. → [ADR-001](../adr/001-empirical-first.md)

---

## 1. El problema

El arquero tiro a cinco distancias y anoto donde quedo la mira en cada una. Quiere saber donde va la
mira a las otras cuarenta.

Formalmente: dados los puntos medidos `(d_i, m_i)` —distancia en metros, marca en milimetros—
construir una funcion `m = f(d)` que sirva dentro y fuera del rango medido.

## 2. Por que no la balistica

La competencia integra la trayectoria de la flecha desde las specs: velocidad, peso, coeficiente de
arrastre, geometria peep-a-pin. Es correcto en el papel y tiene una ventaja real —sirve antes de
tirar la primera flecha— pero traslada **todo** el error de entrada al resultado. La velocidad se
mide con un cronografo que no todos tienen; la geometria, con una regla, a pulso, en la cocina.

En los foros de esos productos, la queja mas repetida es la misma: "cargue los datos y todas las
marcas salieron mal". Un error de dos pies por segundo en la velocidad desplaza el tape completo.

## 3. Por que no la regresion global

La otra familia ajusta una parabola por minimos cuadrados sobre tres marcas. Es robusta al ruido y
extrapola bien.

Su problema es conceptual: **la curva no pasa por ninguno de los puntos medidos.** El arquero mira la
app, ve que a 30 m le dice 2.1 cuando el tiro y anoto 2.0, y deja de creerle. Tiene razon en dejar de
creerle: el 2.0 lo midio el, con su arco, ese dia.

## 4. Lo que hacemos

### 4.1 Dentro del rango medido: PCHIP

Spline cubico de Hermite con tangentes de **Fritsch–Carlson** (PCHIP: _Piecewise Cubic Hermite
Interpolating Polynomial_).

Tres propiedades, y las tres importan:

1. **Pasa exacto por cada punto medido.** `markAt(d_i) === m_i`. Es la promesa del producto.
2. **Es monotono.** Si las marcas suben con la distancia —y suben siempre, porque la flecha cae
   mas—, la curva no baja en ningun tramo intermedio.
3. **No sobrepasa.** Entre dos marcas consecutivas, el valor queda acotado por ellas. Un overshoot
   mandaria al arquero a poner la mira en un lugar donde nunca tiro y donde la flecha no va a ir.

Las tangentes interiores son una **media armonica ponderada** de las pendientes vecinas; en un
extremo local (cuando dos pendientes consecutivas tienen signo distinto) la tangente se anula, que es
justamente lo que evita el overshoot. Las tangentes de los bordes se recortan al estilo SciPy.

### 4.2 Fuera del rango medido: parabola

Parabola de minimos cuadrados `m = a·d² + b·d + c`, resuelta por las ecuaciones normales 3x3 con la
regla de Cramer. Necesita al menos tres puntos.

Sirve para la de sala (18 m, casi siempre por debajo de la marca mas corta que el arquero tiro
afuera) y para las distancias largas.

🔴 **Lo extrapolado se marca como estimado, siempre.** En pantalla va punteado y con `≈`; en la hoja
impresa, con asterisco y su nota al pie. Presentar una estimacion como una medicion seria mentir
sobre lo unico que nos diferencia.

### 4.3 Los residuos: Mark Doctor

La parabola se ajusta sobre **todos** los puntos, incluidos los de adentro del rango. Su residuo en
cada punto —`medido − ajustado`— dice cuanto se aparta esa marca de la forma que deberia tener una
curva de trayectoria.

Una marca con un residuo mucho mayor que el resto es, casi siempre, un error de medicion: se anoto
mal, se tiro con viento, o se cambio algo del equipo entre tandas.

**Ningun competidor ofrece esto.** Es la feature con mejor relacion impacto/esfuerzo del producto,
porque el calculo ya estaba: solo faltaba mostrarlo.

### 4.4 Casos sucios

- **Distancias repetidas.** Se colapsan promediando antes de ajustar. Sin eso, PCHIP divide por cero.
- **Menos de tres marcas.** No hay modelo. La app muestra el progreso `X/5` en vez de una curva que
  no significa nada.
- **Marcas no monotonas.** No se corrigen ni se descartan: el modelo las honra igual, y el Mark
  Doctor las señala. Decidir por el arquero cual de sus mediciones esta mal es exactamente lo que no
  hacemos.

## 5. La regla (ruler)

La escala se dibuja en SVG, con el minimo arriba y creciendo hacia abajo, igual que una mira real.

- **Se trabaja en milimetros enteros.** Un bucle sobre valores en centimetros con paso 0.1 acumula
  error de punto flotante y a los 40 cm ya no cae en la marca. Con enteros, no.
- **Guarda de densidad.** Si las marcas de 1 mm quedarian a menos de 4 px entre si, no se dibujan; lo
  mismo con las de 5 mm. Una regla ilegible es peor que una regla con menos marcas.
- **Anti-solape con leader line.** Dos marcas cercanas tendrian sus etiquetas encimadas: la de abajo
  se empuja, pero se conserva la posicion real para dibujar la linea que une la etiqueta con su punto
  exacto. La etiqueta se mueve; el dato no.

## 6. Lo que sigue

- **Unidades** (F1). El modelo es agnostico: recibe metros y milimetros y devuelve milimetros. La
  conversion a yardas, centimetros, pulgadas o clicks ocurre afuera. La unica pieza acoplada a
  centimetros es la grilla de ticks de la regla, que hay que generalizar para expresar dieciseisavos
  de pulgada.
- **Corte por angulo** (F1). Regla del coseno:
  `distanciaHorizontal = cos(angulo) × distanciaLineaDeVision`, y despues se busca la marca de esa
  distancia horizontal. Es una aproximacion, y es la que usa toda la industria: buena entre 20 y 40
  yardas, que es donde se tira en campo y 3D.
- **Semilla balistica** (F4). Integracion **RK4** de la trayectoria con arrastre, mas busqueda
  binaria sobre el angulo de lanzamiento hasta que la altura de impacto converge. Con arrastre no hay
  solucion cerrada para el angulo. Genera marcas `seeded`, que ceden ante cualquier marca `measured`
  del mismo tramo.

## 7. Lo que no se toca

1. `markAt(d)` devuelve **exactamente** la marca cargada en `d`, para toda marca medida.
2. El spline no decrece ni sobrepasa entre marcas.
3. El dominio es puro: sin I/O, sin framework, sin reloj, sin azar.
4. La regla trabaja en enteros y la grilla imprimible recalcula desde el origen, no acumula.
5. Metros y milimetros adentro. Nada de conversiones dentro del dominio.

Las cinco tienen su test, y el gate de cobertura es 95%. **Los tests portados de `bv-bow-sight` no se
modifican:** si un test cambia, cambio el comportamiento.

## 8. Deuda declarada

**El redondeo quedo diez veces mas fino de lo real.** `roundMark` redondea a `0.1` de la unidad
canonica. Cuando el canonico eran centimetros, eso era 1 mm — justo el paso que un arquero puede
fijar en la mira. Ahora el canonico son **milimetros**, asi que redondea a 0.1 mm: el valor es
correcto, pero se muestra con una precision que nadie puede usar. Se corrige en F1-B, que es donde
entra el concepto de _quantum_ — el paso que el arquero realmente puede fijar, distinto para
centimetros, pulgadas y clicks.

`createSightModel` calcula `useSpline = xs.length >= 3` **despues** de llamar a `fitQuadratic`, que
ya lanza con menos de tres puntos. La rama `false` es inalcanzable. No es un bug —el resultado es
correcto— pero es codigo muerto que aparece como rama sin cubrir en el reporte. Se limpia cuando se
generalice el modelo para unidades (F1).
