# ADR-004 — La landing se prerenderiza con `vite-react-ssg`

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §5.1, §12

## Contexto

La landing es el unico canal de adquisicion del producto: no hay app store, no hay equipo de ventas
y el presupuesto de marketing es cero. Todo lo que llegue va a llegar por busqueda organica y por
foros de arqueria.

Una SPA de Vite sirve un `index.html` vacio que se llena por JavaScript. Para un buscador eso es una
pagina sin contenido.

La PWA del arquero esta detras de login y **no necesita SSR**: es una SPA y debe seguir siendolo.
La decision aplica solo a la landing.

## Opciones consideradas

1. **Next.js.** Es la opcion con mas SEO por default, pero mete un segundo framework, un segundo
   modelo de routing y un segundo runtime de deploy en un monorepo que ya esta estandarizado en
   Vite + TanStack. Con un solo desarrollador, ese costo es permanente.
2. **TanStack Start.** Coherente con el resto del stack, pero suma un servidor Node para la landing
   y arrastra su propio ciclo de madurez.
3. **`vite-react-ssg`.** Prerenderiza las rutas a HTML estatico en el build, conservando el mismo
   Vite, el mismo React 19 y el mismo Tailwind v4 que usa el resto. Salida: archivos estaticos, sin
   servidor.
4. **Dejarla SPA y prerenderizar con un servicio externo.** Depende de un tercero y de un costo
   recurrente para resolver algo que el build puede hacer solo.

## Decision

**Opcion 3.** La landing se prerenderiza a HTML estatico en el build; la PWA queda como SPA.

- Contenido, meta tags, `sitemap.xml` y `robots.txt` salen del build, no del runtime.
- Las paginas legales y el futuro blog son rutas estaticas mas: sin servidor que mantener.
- **Los precios salen de la API**, no de un archivo del front: cambiar un precio no puede exigir un
  deploy de la landing.
- La landing incluye una **demo interactiva de la regla** que corre 100% en el cliente usando
  `@bow-sight/domain`. Es el mejor argumento de venta que tenemos —se ve que el modelo pasa exacto
  por las marcas— y no cuesta un backend.
- El checkout y el formulario de contacto son llamadas a `/api/v1` desde el cliente.

## Consecuencias

- Un solo framework y un solo modelo de build en todo el monorepo. Deploy como estaticos: barato,
  cacheable y sin superficie de ataque de servidor.
- Sin SSR en request-time, cualquier contenido personalizado por visitante requiere hidratacion en
  cliente. Para una landing de producto no es una limitacion real.
- **El build va antes de los tests en el CI**, a proposito: los tests de la landing verifican el HTML
  **prerenderizado**, que solo existe despues de buildear. Con el orden al reves se saltean en
  silencio y el SSG queda sin cubrir.
- La demo de la regla obliga a que `@bow-sight/domain` siga siendo puro y sin dependencias de Node:
  se ejecuta en el navegador de alguien que todavia no es usuario.
- El contenido del blog, cuando exista, se resuelve con Markdown en el repo y no con un CMS. Si
  alguna vez hace falta publicar sin deploy, esta decision se revisa.
