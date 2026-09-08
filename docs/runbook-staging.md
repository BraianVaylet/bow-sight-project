# Runbook — staging, backups y restauracion

Procedimientos de infraestructura de la spec §6.7. Ambientes: `dev` (local) · `staging` (datos
sinteticos) · `prod`. **Prohibido probar en prod.**

## 1. Servicios

Tres servicios por ambiente, uno por app. Cada uno lee su `railway.json`:

| Servicio            | Config                      | Health check | Notas                        |
| ------------------- | --------------------------- | ------------ | ---------------------------- |
| `bow-sight-api`     | `apps/api/railway.json`     | `/ready`     | Verifica la conexion a Mongo |
| `bow-sight-pwa`     | `apps/pwa/railway.json`     | `/`          | App del arquero              |
| `bow-sight-landing` | `apps/landing/railway.json` | `/`          | Estaticos prerenderizados    |

El health check de la API apunta a `/ready` y no a `/health` a proposito: `/health` responde 200
mientras el proceso viva, aunque Mongo este caido. Un servicio que responde pero no puede leer nada
no esta listo para recibir trafico.

## 2. Variables de entorno

Viven en Railway, **nunca en el repo**. La lista completa esta en `.env.example`; las que no pueden
faltar porque la API no arranca sin ellas:

```
MONGODB_URI            # Atlas, con replica set
MONGODB_DB_NAME
BETTER_AUTH_SECRET     # openssl rand -base64 32
BETTER_AUTH_URL
CORS_ORIGINS           # los dominios de la PWA y la landing, sin comodines
APP_ENV                # staging | prod
JOBS_ENABLED           # false en las replicas que no deban correr jobs
RESEND_API_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
MP_ACCESS_TOKEN
MP_WEBHOOK_SECRET
```

`loadEnv()` valida todas al arrancar y falla con la lista de las que faltan. Es deliberado: es
preferible que el deploy no levante a que levante y explote a las 3 AM con un `undefined`.

En **staging** se usan las claves de test de Stripe, el sandbox de Mercado Pago y un dominio de
Resend distinto, para que un mail de verificacion de prueba no llegue nunca a un usuario real.

### Rotacion de secretos

1. Generar el valor nuevo y cargarlo en Railway como variable nueva (`BETTER_AUTH_SECRET_NEXT`).
2. Desplegar leyendo las dos, aceptando ambas firmas.
3. Cuando no queden sesiones firmadas con la vieja (maximo, el TTL de sesion), quitar la anterior.

Rotar `BETTER_AUTH_SECRET` de golpe invalida todas las sesiones activas.

## 3. MongoDB Atlas

- 🔴 **Replica set obligatorio.** Las transacciones que usa el procesamiento de webhooks —escribir el
  evento, actualizar la suscripcion y tocar el plan del usuario en una sola operacion— no existen sin
  el. Un cluster standalone hace fallar esos flujos en runtime, no en el build.
- Backups automaticos con **PITR** habilitado.
- Alertas de conexion y de storage.
- **Region:** documentar cual es. Hay que poder decir donde estan los datos de los usuarios.

### Migraciones

```bash
pnpm exec migrate-mongo up
```

Se corren **antes** del deploy de la API, no desde el arranque del proceso: si dos instancias
levantan a la vez, dos corren las migraciones. Nunca cambios manuales en Atlas.

### Importar los datos del autor desde SQLite

Se corre **una sola vez**, cuando staging ya tiene su cluster y sus indices.

1. El arquero **se crea la cuenta desde la app**, por el camino normal. El script no crea usuarios ni
   contraseñas: el hash de la app vieja es argon2id sobre un alias y Better Auth usa otro esquema
   sobre un email.
2. Sacar una **copia** del `.db` de `bv-bow-sight`. Nunca trabajar sobre el original.
3. Ensayar sin escribir:

   ```bash
   pnpm exec tsx scripts/import-sqlite.ts --db ./copia.db --email <el-email> --dry-run
   ```

   Imprime cuantas filas va a migrar por coleccion. Si los numeros no son los esperados, parar.

4. Correrlo de verdad, sin `--dry-run`. Escribe dentro de una **transaccion** —por eso el replica set
   es obligatorio— y despues cuenta contra la base, no contra lo que acaba de armar. Si un conteo no
   coincide, falla en vez de dar la migracion por buena.
5. Abrir la PWA y verificar que las marcas se ven con los mismos valores, leidas en centimetros.
6. Anotar en `docs/BITACORA.md` cuantos documentos entraron por coleccion.

Lo que **no** hace, a proposito: no migra sesiones (son tokens firmados con otra clave; todos vuelven
a entrar) y no borra nada del origen.

## 4. Backup y restauracion

**Objetivos:** RPO 24 h o menos · RTO 4 h o menos.

> Un backup sin restore probado no es un backup. Es un archivo del que nadie sabe nada.

### Procedimiento de verificacion

Al menos una vez, y despues de cada cambio de esquema grande:

1. Elegir el snapshot mas reciente en Atlas.
2. Restaurarlo a un **cluster nuevo y aparte**, nunca encima de staging ni de prod.
3. Contar documentos por coleccion y comparar contra el origen:

   ```js
   db.getCollectionNames().forEach((name) => print(name, db[name].countDocuments()));
   ```

4. Verificar los indices criticos, que son los que sostienen la integridad:

   ```js
   db.mark.getIndexes(); // user_sight_arrowset_distance_unique
   db.billingEvent.getIndexes(); // provider_eventid_unique
   ```

5. Levantar la API apuntando al cluster restaurado y comprobar que `/ready` responde 200.
6. Anotar en `docs/BITACORA.md`: fecha, snapshot usado, tiempo total y si se cumplio el RTO.
7. Borrar el cluster de prueba.

El paso 6 es el que convierte esto en un procedimiento y no en una anecdota: si nadie anoto cuanto
tardo, no sabemos si el RTO de 4 horas es real.

## 5. Monitoreo

- **Uptime externo** sobre `/ready` de la API y sobre la landing, con alerta a WhatsApp o Telegram.
  Externo y no interno: si el servicio se cae, un monitor que vive adentro se cae con el.
- Alertas de la spec §10.3: 5xx por encima del 1% en 5 minutos · job fallido · webhook sin procesar
  por mas de 15 minutos.
- Los jobs dejan su corrida en `jobRun`.

## 6. Deploy

`main` con el CI en verde despliega a staging. A prod se promueve a mano, con un tag, despues de
probar en staging.

El CI corre, en este orden: formato → enlaces de la documentacion → lint → typecheck → **build** →
tests con gate de cobertura → e2e → auditoria. El build va antes que los tests porque las aserciones
de la landing verifican el HTML prerenderizado, que solo existe despues de buildear.

## 7. Webhooks

Los endpoints de webhook viven **fuera** de `/api/v1` y fuera del limitador por IP. Al configurarlos
en el panel de cada proveedor:

- **Stripe:** apuntar a `/webhooks/stripe` y copiar el signing secret a `STRIPE_WEBHOOK_SECRET`.
  Eventos: `checkout.session.completed`, `customer.subscription.*`, `invoice.paid`,
  `invoice.payment_failed`, `charge.refunded`, `charge.dispute.created`.
- **Mercado Pago:** apuntar a `/webhooks/mercadopago`. Topicos: `subscription_preapproval_plan`,
  `subscription_preapproval`, `subscription_authorized_payment`.

Si un webhook queda sin procesar mas de 15 minutos, salta la alerta. La cola de fallidos se reprocesa
desde `billingEvent`, que guarda el payload completo.

## 8. Escala

Railway alcanza para las primeras miles de cuentas. El disparador para mover a un VPS es **costo o
limites de recursos, no estetica**. Para saberlo hace falta la metrica de costo por usuario desde el
dia uno.
