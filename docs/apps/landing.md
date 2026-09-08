# Landing — el sitio publico

> La puerta de entrada. Puerto de desarrollo: **5176**.

## Que es

El sitio que explica el producto y arranca la prueba. **Se prerenderiza a HTML estatico** con
`vite-react-ssg`: una SPA sin SSR no rankea, y esta pagina existe para que la encuentren
(→ [ADR-004](../adr/004-landing-rendering.md)).

Es el **unico canal de adquisicion**: no hay app store, no hay equipo de ventas y el presupuesto de
marketing es cero.

## Secciones

| Seccion                   | Que dice                                                                                 |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| **Demo de la regla**      | Una regla interactiva con marcas de ejemplo. Se ve que la curva pasa exacto por cada una |
| **Contra el papelito**    | Por que esto y no una cinta escrita a mano que se moja                                   |
| **Contra la competencia** | La comparacion, honesta y verificable: empirico contra regresion contra balistica        |
| **Precios**               | Los tres planes, **leidos de la API**                                                    |
| **Empezar**               | Alta con 14 dias de prueba sin tarjeta                                                   |
| **Contacto**              | Genera un interesado en el CRM                                                           |

Y las paginas legales: terminos, privacidad y tratamiento de datos.

## Decisiones

- **La demo corre en el cliente**, con `@bow-sight/domain`. Es el mejor argumento de venta que
  tenemos —se ve el diferenciador, no se lee— y no cuesta un backend. Tambien es la razon por la que
  el dominio tiene que seguir siendo puro y sin dependencias de Node: se ejecuta en el navegador de
  alguien que todavia no es usuario.
- **Los precios salen de la API**, no de un archivo del front: cambiar un precio no puede exigir un
  deploy de la landing.
- **Lo que no se puede afirmar, no se afirma.** Sin testimonios inventados ni capturas de features
  que no existen. Inventar un testimonio es mentirle a quien esta decidiendo si contrata.
- La comparacion contra la competencia es **verificable**: cita el enfoque tecnico de cada producto,
  no adjetivos.
- El formulario de contacto valida en el cliente y en el servidor con el mismo schema.

## SEO e idiomas

Meta tags por pagina, `sitemap.xml` y `robots.txt` generados en el build. **Rutas por idioma con
`hreflang`**: el mercado que paga esta en ingles y el que valida esta en español, y los dos tienen
que rankear (ADR-005).

Los tests verifican el HTML **prerenderizado**, no el que arma React en el navegador: por eso en el
CI el build va antes de los tests.

## Deuda declarada

Ninguna todavia: la app existe recien desde la Fase 0 y su contenido real se escribe en la Fase 5.
Lo que hay hasta entonces es el esqueleto y la demo de la regla.
