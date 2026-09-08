# Landing — contexto del sitio publico

La puerta de entrada del producto. Puerto de desarrollo: **5176**.
Documento de la app: [`docs/apps/landing.md`](../../docs/apps/landing.md).

## Se prerenderiza, no es una SPA

`vite-react-ssg` emite un `.html` por ruta con el contenido ya adentro (ADR-004). No es una
preferencia: **la landing es el canal de adquisicion**, y una SPA vacia es, para un buscador, una
pagina sin contenido.

Consecuencias que hay que respetar al escribir un componente:

- **Nada que solo exista despues de hidratar.** Si el texto que vende el producto se pinta en un
  `useEffect`, en el HTML no esta.
- **Nada de `window` ni `document` en el cuerpo del render**: el prerender corre en Node y explota.
  Va adentro de un `useEffect`, que en el build no se ejecuta.
- 🔴 **Los tests de `src/ssg.test.ts` leen `dist/`, no el arbol de React.** Por eso en el CI el
  build va **antes** que los tests. Al reves se saltearian en silencio y el SSG quedaria sin
  cubrir — justo el escenario en el que la landing deja de rankear sin que nadie se entere.

## Reglas de la casa

1. 🔴 **Una pagina nueva se agrega a `src/seo.ts` primero.** De esa tabla salen el `<title>`, la
   meta description, el Open Graph, el canonical, el `sitemap.xml` y el `robots.txt`. Fuera de la
   tabla, la pagina existe pero nadie la encuentra.
2. 🔴 **La demo de la regla corre `@bow-sight/domain` en el cliente, sin API.** Es el argumento de
   venta y tiene que funcionar sin backend, sin cuenta y sin red. Prohibido hacerle un `fetch`.
3. 🔴 **La comparacion contra la competencia habla de enfoque tecnico, no de calidad.** Se compara
   que hace cada app —ajustar una curva vs. pasar por las marcas medidas—, sin adjetivos, sin
   precios ajenos que envejecen y sin testimonios inventados.
4. **Los precios salen de un solo lugar.** Si un numero esta en dos componentes, un dia van a decir
   cosas distintas.
5. **Cero estado de servidor.** No hay Query, no hay sesion y no hay cookies. Lo unico que sale a
   la red es el formulario de contacto (F5).
6. **Sin dependencias que solo vivan en el navegador** en el arbol prerenderizado.

## Estructura

```
src/
  seo.ts         la tabla de paginas — sitemap y robots salen de aca
  Layout.tsx     <Head> por ruta, header y footer
  routes.tsx     una entrada por pagina, con su `entry:` para el code split
  pages/         Home · Precios · Legal
  sections/      Demo (la regla) · VsCompetencia
  ssg.test.ts    aserciones sobre el HTML emitido
```

El plugin `bow-sight:seo` de `vite.config.ts` escribe `sitemap.xml` y `robots.txt` en el
`closeBundle`.

## Comandos

`pnpm --filter @bow-sight/landing dev` · `build` · `test` · `typecheck` · `lint`

**`test` exige un `build` previo.** Sin `dist/` los tests fallan con el motivo escrito.
