# ADR-003 — Cobro: doble pasarela detras de un adaptador

- **Estado:** Aceptada
- **Fecha:** 2026-09-07
- **Spec:** §2.2, §12

## Contexto

Bow Sight cobra una suscripcion barata: Pro alrededor de US$17/año y Max alrededor de US$35/año,
por debajo de Archer's Advantage (US$15/año) que es el piso del mercado. El publico es global —
Estados Unidos concentra el dinero — pero el autor factura desde Argentina y su red de validacion
inicial es local, que paga en pesos.

Dos restricciones concretas: **Stripe no opera directamente en Argentina** por normativa del BCRA
(se usa via dLocal, con la comision real subiendo a 4–6%, o con una entidad en el exterior), y
vender software a la Union Europea obliga a registrarse y liquidar IVA por jurisdiccion.

## Opciones consideradas

1. **Solo Mercado Pago.** Resuelve el cobro local con cuotas y metodos que la gente usa, pero deja
   afuera al mercado que paga en dolares.
2. **Solo Stripe.** El estandar para SaaS, pero desde Argentina implica dLocal o una entidad
   afuera, y ademas hay que resolver el IVA europeo por cuenta propia.
3. **Merchant of Record** (Lemon Squeezy o Paddle). Venden ellos legalmente, calculan y remiten los
   impuestos y pagan a cuenta internacional. Alrededor de 7–7,5% all-in: mas caro por transaccion,
   pero elimina el problema fiscal completo.
4. **Stripe para USD + Mercado Pago para ARS**, cada uno detras de un adaptador.

## Decision

**Opcion 4 como arranque, con la opcion 3 explicitamente evaluada y lista para reemplazar el
adaptador de Stripe** si dar de alta el cobro desde Argentina resulta impracticable o si el costo
contable de liquidar impuestos supera la diferencia de comision.

Reglas derivadas:

- **La logica de planes no conoce al proveedor.** Un unico modelo de suscripcion y entitlements; los
  proveedores entran por adaptador (`billing/stripe.ts`, `billing/mercadopago.ts`). Cambiar de
  pasarela es reemplazar un archivo, no reescribir el cobro.
- **Los limites de cada plan viven en codigo**, en `@bow-sight/domain`, no en la base: la PWA tiene
  que poder decidir si muestra el upsell sin una llamada de red. Los precios y los IDs de producto
  de cada proveedor si van por configuracion.
- **Idempotencia obligatoria en webhooks.** El id del evento es la clave primaria de
  `billingEvents`; un evento repetido se descarta y responde 200.
- **En Mercado Pago nunca se confia en el cuerpo de la notificacion.** Es un puntero: se verifica la
  firma y despues se re-consulta el recurso a la API de MP. Es el error de integracion mas comun.
- **Nunca se borra nada por falta de pago.** Al vencer, `effectivePlan()` devuelve `free` por reloj,
  y lo que excede el limite queda **bloqueado**: legible e imprimible, no editable. Bloquear una
  hoja de marcas que alguien va a usar en un torneo no es una opcion.
- **Los datos de tarjeta nunca tocan Bow Sight.** Tokenizacion del lado del proveedor, siempre.

## Consecuencias

- Hay que mantener dos integraciones y dos juegos de webhooks. Es el costo de cobrar en dos monedas
  con dos culturas de pago distintas.
- Las cookies de sesion pasan a `SameSite=Lax`: tanto Stripe Checkout como el `back_url` de Mercado
  Pago vuelven por una navegacion cross-site, y con `Strict` el usuario aterriza deslogueado y cree
  que el pago fallo. La proteccion CSRF sigue cubierta por el token de doble envio.
- Los webhooks se montan **fuera** de `/api/v1` y fuera del limitador por IP: Stripe reintenta desde
  IPs rotativas y un 429 hace que marque el endpoint como caido.
- Si se migra a un Merchant of Record, Mercado Pago no cambia: la decision solo reemplaza el
  adaptador de USD.
