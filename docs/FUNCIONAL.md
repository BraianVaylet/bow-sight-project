# Documento funcional — Bow Sight

> Que hace el producto, por rol y por modulo. **Sin implementacion**: aca no hay colecciones,
> endpoints ni nombres de archivo. Para eso estan [TECNICO.md](TECNICO.md) y
> [ARQUITECTURA.md](ARQUITECTURA.md).
>
> La fuente de verdad es `docs/spec/BOW-SIGHT-SPEC.md`. Este documento la resume y la ordena; si
> discrepan, manda la spec.

---

## 1. Que problema resuelve

Un arquero de arco compuesto tiene una mira con una escala, y para cada distancia hay un punto de
esa escala donde la mira tiene que ir. Eso no se calcula: se descubre tirando. Y cambia por completo
cuando cambia el set de flechas.

Hoy eso vive en un papelito pegado a la mira. El papelito se moja, se despega, se escribe encima
cuando cambian las flechas, y cuando se pierde hay que volver a tirar todo desde cero — que son
horas de campo y flechas que se gastan.

**Bow Sight es el reemplazo de ese papelito.** Guarda las marcas, calcula las distancias que el
arquero nunca tiro, y le devuelve una hoja o una cinta a escala real para llevar al torneo.

**La meta del producto** es que un arquero llegue a cinco marcas cargadas en un mismo set de
flechas. Ese es el momento en que la app deja de ser una libreta y se vuelve util: ahi se desbloquea
el calculo, y ahi empieza a valer una suscripcion.

## 2. Quienes lo usan

| Rol           | Sigla | Donde entra | Que hace                                                          |
| ------------- | ----- | ----------- | ----------------------------------------------------------------- |
| **Arquero**   | AU    | PWA         | Todo: su equipo, sus miras, sus marcas, su suscripcion            |
| **Coach**     | CU    | PWA         | Ve, **en solo lectura**, los perfiles que un arquero le compartio |
| **Visitante** | VU    | Landing     | Conoce el producto, prueba la demo, se registra                   |

No hay super admin ni panel de staff: es un producto B2C de autoservicio.

> 🔴 **El coach nunca escribe.** No porque la pantalla se lo esconda: la API no se lo permite. Un
> coach que puede corregir la marca de su atleta puede arruinarle un torneo.

## 3. Las dos aplicaciones

### La PWA — la app del arquero

Mobile-first, para usar **de pie, con guantes, al sol y sin señal**. Se instala desde el navegador,
sin pasar por una tienda.

- **Mis miras.** Las miras del arquero. Se puede fijar una como la de arranque, para que la app abra
  directo en la que esta usando hoy.
- **La mira.** La pantalla estrella: una regla vertical que imita la escala fisica de la mira, con
  todas las marcas del set seleccionado ubicadas en su posicion exacta. Debajo, la curva, la
  calculadora de cualquier distancia y el tape imprimible.
- **Equipo.** Sus arcos y sus sets de flechas, con specs reales.
- **Compartido conmigo.** Los perfiles que otros arqueros le compartieron.
- **Plan.** Su suscripcion, cuanto uso lleva contra los limites, y el portal para cambiar o cancelar.

### La landing — la puerta de entrada

Que es el producto, por que es distinto, cuanto sale y como empezar la prueba. Con una **demo
interactiva de la regla** que corre en el navegador de alguien que todavia no es usuario: se ve, con
marcas de ejemplo, que la curva pasa exacto por cada una.

> 🔴 **Lo que no se puede afirmar, no se afirma.** Sin testimonios inventados ni capturas de
> features que no existen.

## 4. Que hace cada modulo

### Cuenta

Alta con email y contraseña. La verificacion de email es obligatoria antes de cobrar. Reset por
email. Cambiar el email verifica la direccion **nueva** y le avisa a la vieja.

El arquero elige su idioma (español o ingles) y su unidad de distancia (metros o yardas).

**Sus datos son suyos:** puede descargar todo lo que guardamos de el, en JSON, en el momento; y puede
pedir la baja. La baja se registra con fecha y la pantalla dice hasta cuando se conservan los datos.

### Equipo

**Setups de arco:** marca, modelo, libraje, ATA, brace height, draw length.
**Sets de flechas:** spine, peso de punta, largo, vanes, nocks, peso total, velocidad medida.

Son campos reales, no un cuaderno de notas. Sin eso no hay semilla balistica ni comparacion entre
sets, que son dos de las razones para pagar Max.

Borrar un set de flechas **que tiene marcas cargadas** se bloquea con un mensaje claro: son meses de
datos y no se pierden en silencio.

### Miras

Una mira es su escala: el minimo, el maximo y la unidad en la que el arquero la lee — centimetros,
pulgadas o clicks. Un arquero puede tener varias.

Reducir el rango de la escala dejando marcas afuera se bloquea, y el mensaje dice cuantas quedarian
fuera.

### Marcas — el corazon del producto

Una marca dice: con **este** set de flechas, a **esta** distancia, la mira va en **este** punto de la
escala. Se cargan tirando.

**Con cinco marcas en un mismo set se desbloquea el calculo**, y ahi aparece todo lo demas:

- **Las distancias que nunca tiro.** Las intermedias entre sus marcas y la de sala (18 m).
- **La calculadora.** El arquero escribe cualquier distancia y obtiene su marca al instante.
- **El tape.** La cinta a escala real para pegar en la mira, o la hoja cada 2 m para llevar al
  torneo.
- **El corte por angulo.** En campo y 3D se tira cuesta arriba y cuesta abajo, y ahi la distancia que
  importa es la horizontal, no la que mide el telemetro.
- **Mark Doctor.** La app señala cual de sus marcas esta probablemente mal medida y le sugiere volver
  a tirar esa distancia.

> 🔴 **El modelo pasa exacto por lo que el arquero tiro.** Es la promesa del producto y lo que nos
> separa de la competencia: las otras apps ajustan una curva que no pasa por ninguna de sus marcas,
> o calculan la trayectoria a partir de datos que el midio con una regla. Aca la marca medida manda
> siempre.
>
> Y **lo medido se distingue de lo estimado**, en pantalla y en papel. Presentar una estimacion como
> una medicion seria mentir sobre lo unico que nos diferencia.

### Compartir con un coach

El arquero comparte **un perfil de mira** con su entrenador, por email. El coach lo ve, no lo toca, y
el acceso se revoca en un toque con efecto inmediato.

### Suscripcion

Tres planes, con **14 dias de prueba sin tarjeta**. Se cobra en dolares o en pesos, segun de donde
sea el arquero.

> 🔴 **Nunca se borra nada por dejar de pagar.** Lo que excede el limite del plan queda bloqueado:
> se puede seguir leyendo e imprimiendo, no editando. Y el arquero elige cual de sus miras queda
> activa sin tener que pagar para decidirlo. Bloquear una hoja de marcas que alguien va a usar en un
> torneo el domingo no es una opcion.

### Avisos

Por email, en el idioma del arquero: verificacion de cuenta, reset de contraseña, invitacion de
coach, aviso de que la prueba vence (3 dias y 1 dia antes), cobro fallido y baja de plan.

## 5. Los planes

|                           | **Free** | **Pro**                    | **Max**                    |
| ------------------------- | -------- | -------------------------- | -------------------------- |
| Precio                    | —        | US$1.99/mes · US$16.99/año | US$3.99/mes · US$34.99/año |
| Miras                     | 1        | ilimitadas                 | ilimitadas                 |
| Sets de flechas           | 2        | ilimitados                 | ilimitados                 |
| Marcas por mira           | 15       | ilimitadas                 | ilimitadas                 |
| La regla y la calculadora | si       | si                         | si                         |
| Yardas, pulgadas y clicks | —        | si                         | si                         |
| Tape a escala real        | —        | si                         | si                         |
| Corte por angulo          | —        | si                         | si                         |
| Mark Doctor por marca     | —        | si                         | si                         |
| Export y backup           | —        | si                         | si + import                |
| Escritura sin conexion    | —        | si                         | si                         |
| Semilla balistica         | —        | —                          | si                         |
| Ajuste por condiciones    | —        | —                          | si                         |
| Compartir con coach       | —        | —                          | hasta 3                    |

**Los limites se aplican en el servidor.** El arquero que crea la mira 2 en Free falla con un mensaje
que dice cual es el limite y que plan lo levanta.

## 6. Que no hace

**Nunca**, en ninguna fase: scoring, torneos, analisis de forma por video, tienda ni red social. Es
un producto vertical, y esa es la decision.

Lo que queda para mas adelante, con su fase:

- **Escritura sin conexion** con cola de sincronizacion → Fase 3.
- **Semilla balistica** desde las specs del equipo → Fase 4.
- **Motor de condiciones** (temperatura y altitud) → Fase 4.
- **Compartir con coach** → Fase 4.
- **Portugues** → sin fecha, preparado pero no abierto.
- **Reloj o widget** → se evalua despues del lanzamiento si aparece demanda.
