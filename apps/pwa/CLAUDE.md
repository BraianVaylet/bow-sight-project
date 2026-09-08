# PWA — contexto de la app

La app del arquero. **Se usa en la linea de tiro.** Puerto de desarrollo: **5173**.
Documento de la app: [`docs/apps/pwa.md`](../../docs/apps/pwa.md).

## El contexto de uso manda

De pie, con guantes, al sol, entre dos tandas, y sin señal. Eso no es una anecdota: decide casi
todas las reglas de abajo.

- **Todo lo tocable mide 44x44 px como minimo.**
- **Contraste AA verificado**, en claro y en oscuro. Lo aplica un test de `@bow-sight/ui`.
- **Las acciones sobre marcas son optimistas.** Esperar dos segundos mirando un spinner en la linea
  de tiro es el peor pecado de este producto.
- **Se ve sin red.** Desde F3 tambien se escribe sin red, con cola de sincronizacion.
- 🔴 **La app no se recarga sola.** El aviso de version nueva **pregunta**: recargar mientras el
  arquero anota una marca le hace perder lo que estaba escribiendo.

## Reglas de la casa

1. 🔴 **Medido, calculado y consultado se ven distinto.** Lo calculado va punteado y con `≈`.
   Presentar una estimacion como una medicion seria mentir sobre lo unico que nos diferencia
   (ADR-001).
2. 🔴 **Ningun string de usuario hardcodeado** una vez que entre i18n (F1-A). Hoy el puente es
   `app/errorText.ts`, que traduce las **claves** que manda la API; cuando llegue i18next se
   reemplaza por `t()` y el mapa se muda a los catalogos.
3. **La conversion de unidades ocurre aca**, en el borde. Adentro todo es canonico: metros y
   milimetros. Nunca se manda a la API un valor ya convertido.
4. Frontera de estado: **Query = servidor · Zustand = UI · Nuqs = filtros urleables.** Nunca
   duplicar estado de servidor en Zustand.
5. Sin logica de negocio en componentes. El math vive en `@bow-sight/domain`.
6. Un elemento que **navega** es un `<a>`, no un `<button>` con `onClick`: `buttonClasses()` de
   `@bow-sight/ui` comparte el estilo sin robarle el rol.

## Rutas publicas

`/entrar`, `/crear-cuenta`, `/recuperar` — y dos que existen porque un mail lleva ahi:

- `/email-verificado` — la vuelta del mail de verificacion.
- `/restablecer` — la pantalla para escribir la clave nueva.

🔴 Las dos son **publicas a proposito**: quien abre el mail en otro dispositivo no tiene sesion, y
mostrarle un login en vez de la confirmacion seria un callejon.

## Comandos

`pnpm --filter @bow-sight/pwa dev` · `build` · `test` · `typecheck` · `lint`

En dev, Vite proxea `/api` al backend en el 3000. El service worker esta **apagado en dev**: solo
estorba.
