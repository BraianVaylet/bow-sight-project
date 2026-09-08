# Arnes de los E2E

`api-server.ts` levanta la API real contra un **Mongo efimero en memoria, con replica set** —sin el no
hay transacciones— y la tira al terminar. Escucha en el 3000, que es adonde la PWA proxea `/api` en
dev.

🔴 **Nunca apunta a staging ni a produccion.** Estos tests escriben.

## El buzon

El arnes usa `MemoryMailer` y expone dos rutas que **solo existen aca**:

| Ruta                | Que hace                    |
| ------------------- | --------------------------- |
| `GET /e2e/mails`    | Los mails que se "mandaron" |
| `DELETE /e2e/mails` | Vacia el buzon              |

Es la unica forma de verificar de punta a punta que el mail de verificacion lleva a **nuestra** ruta
y no a la de Better Auth, que no esta montada. Ese error deja cuentas que no se pueden verificar
nunca, y sin este buzon no se ve hasta que lo reporta alguien.

## Que se corre hoy

- `cuenta.spec.ts` — crear cuenta, sesion que sobrevive a recargar, guarda de ruta, el mensaje unico
  de credenciales invalidas, y el mail de verificacion.
- `landing.spec.ts` — la landing se ve, la demo pasa exacto por la marca medida **sin llamar a la
  API**, y precios muestra los tres planes.

Faltan los dos caminos criticos que todavia no existen en la app: cargar cinco marcas y ver una
calculada, e imprimir el tape. Entran con F1.

## Puertos

Los tres estan fijos con `strictPort` en sus `vite.config.ts`. No es cosmetico:
`vite-react-ssg dev` **ignora `--port`**, asi que la landing se levantaba en el 5173, chocaba con la
PWA y se corria sola al 5174 sin decir nada — y Playwright esperaba dos minutos a un servidor que
nunca iba a estar en el 5176.
