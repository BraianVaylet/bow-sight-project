# Diccionario de codigos de error

**Formato:** `BS-<MODULE>-<HTTP>-<NNN>`

- `MODULE`: prefijo de 3 a 5 letras mayusculas del modulo (tabla de abajo).
- `HTTP`: status HTTP con el que se responde.
- `NNN`: correlativo de 3 digitos, **por modulo**, que nunca se reutiliza.

Este archivo crece por modulo. **Definir los codigos nuevos es parte del Definition of Ready**
(spec §14): una tarea no arranca sin sus codigos declarados aca.

## Respuesta de error unificada

```json
{
  "success": false,
  "error": {
    "code": "BS-MARK-409-002",
    "messageKey": "errors.mark.outOfScale",
    "params": { "min": 0, "max": 60 },
    "requestId": "01J9X...",
    "timestamp": "2026-09-07T14:03:11.412Z"
  }
}
```

Reglas:

- 🔴 **La API no manda prosa.** Manda `messageKey` y `params`; el idioma lo resuelve el cliente
  (ADR-005). Un mensaje en español dentro de una respuesta HTTP es un desvio de spec.
- Todo error mostrado al usuario incluye el `code` y el `requestId`, para que pueda compartirlos con
  soporte.
- El texto de cada clave vive en los catalogos, en `es` **y** en `en`. Toda clave dice **que puede
  hacer el usuario**, no solo que fallo.
- El log del error incluye el mismo `errorCode` y el mismo `requestId`.
- Un `catch` que solo loguea sin codigo tipado **no cumple el DoD**.

## Prefijos de modulo

| Prefijo | Modulo                       | Prefijo | Modulo                  |
| ------- | ---------------------------- | ------- | ----------------------- |
| `AUTH`  | Autenticacion y autorizacion | `SHARE` | Compartir con coach     |
| `ACCT`  | Cuenta y preferencias        | `BILL`  | Cobro                   |
| `EQUIP` | Equipo (arcos y flechas)     | `SUBS`  | Suscripciones           |
| `SIGHT` | Miras                        | `ENTL`  | Entitlements y limites  |
| `MARK`  | Marcas y calculo             | `CRM`   | Interesados             |
| `UNIT`  | Unidades y conversion        | `SYS`   | Sistema / no controlado |

## Diccionario

El `NNN` es correlativo **por modulo** y **nunca se reutiliza**, aunque cambie el HTTP. Antes de
agregar uno, mira el ultimo de su modulo.

Los codigos de abajo cubren las Fases 0 a 2. Los de las fases siguientes se declaran cuando la fase
se abre.

### AUTH — Autenticacion y autorizacion

| Codigo            | HTTP | Significado                              | Clave de mensaje                 |
| ----------------- | ---- | ---------------------------------------- | -------------------------------- |
| `BS-AUTH-401-001` | 401  | Credenciales invalidas                   | `errors.auth.invalidCredentials` |
| `BS-AUTH-401-002` | 401  | Sesion invalida o vencida                | `errors.auth.sessionExpired`     |
| `BS-AUTH-403-003` | 403  | Email sin verificar                      | `errors.auth.emailNotVerified`   |
| `BS-AUTH-409-004` | 409  | El email ya esta registrado              | `errors.auth.emailTaken`         |
| `BS-AUTH-429-005` | 429  | Demasiados intentos                      | `errors.auth.tooManyAttempts`    |
| `BS-AUTH-400-006` | 400  | Token de verificacion invalido o vencido | `errors.auth.badToken`           |
| `BS-AUTH-400-007` | 400  | Token de reset invalido o vencido        | `errors.auth.badResetToken`      |

### ACCT — Cuenta y preferencias

| Codigo            | HTTP | Significado                   | Clave de mensaje                 |
| ----------------- | ---- | ----------------------------- | -------------------------------- |
| `BS-ACCT-404-001` | 404  | La cuenta no existe           | `errors.account.notFound`        |
| `BS-ACCT-409-002` | 409  | Ya hay una baja pendiente     | `errors.account.deletionPending` |
| `BS-ACCT-400-003` | 400  | Idioma o unidad no soportados | `errors.account.badPreference`   |

### EQUIP — Equipo

| Codigo             | HTTP | Significado                                 | Clave de mensaje                   |
| ------------------ | ---- | ------------------------------------------- | ---------------------------------- |
| `BS-EQUIP-404-001` | 404  | El setup no existe o no es tuyo             | `errors.equipment.notFound`        |
| `BS-EQUIP-409-002` | 409  | El set de flechas tiene marcas cargadas     | `errors.equipment.arrowSetInUse`   |
| `BS-EQUIP-400-003` | 400  | Specs incompletas para la semilla balistica | `errors.equipment.incompleteSpecs` |

### SIGHT — Miras

| Codigo             | HTTP | Significado                                         | Clave de mensaje                    |
| ------------------ | ---- | --------------------------------------------------- | ----------------------------------- |
| `BS-SIGHT-404-001` | 404  | La mira no existe o no es tuya                      | `errors.sight.notFound`             |
| `BS-SIGHT-400-002` | 400  | La escala minima no es menor que la maxima          | `errors.sight.badScaleRange`        |
| `BS-SIGHT-409-003` | 409  | El rango nuevo dejaria marcas afuera                | `errors.sight.marksOutsideNewRange` |
| `BS-SIGHT-403-004` | 403  | La mira esta bloqueada por el plan                  | `errors.sight.locked`               |
| `BS-SIGHT-400-005` | 400  | Falta el tamaño del click para una escala en clicks | `errors.sight.missingClickSize`     |

### MARK — Marcas y calculo

| Codigo            | HTTP | Significado                                   | Clave de mensaje                |
| ----------------- | ---- | --------------------------------------------- | ------------------------------- |
| `BS-MARK-404-001` | 404  | La marca no existe o no es tuya               | `errors.mark.notFound`          |
| `BS-MARK-409-002` | 409  | El valor de escala cae fuera de la mira       | `errors.mark.outOfScale`        |
| `BS-MARK-409-003` | 409  | Ya hay una marca para esa distancia y ese set | `errors.mark.duplicateDistance` |
| `BS-MARK-422-004` | 422  | Faltan marcas para calcular                   | `errors.mark.notEnoughMarks`    |
| `BS-MARK-400-005` | 400  | Distancia fuera de rango                      | `errors.mark.badDistance`       |
| `BS-MARK-409-006` | 409  | La marca cambio en otro dispositivo           | `errors.mark.staleWrite`        |
| `BS-MARK-400-007` | 400  | El angulo esta fuera de rango                 | `errors.mark.badAngle`          |

### UNIT — Unidades

| Codigo            | HTTP | Significado                      | Clave de mensaje          |
| ----------------- | ---- | -------------------------------- | ------------------------- |
| `BS-UNIT-400-001` | 400  | Unidad no soportada              | `errors.unit.unsupported` |
| `BS-UNIT-403-002` | 403  | El sistema imperial requiere Pro | `errors.unit.requiresPro` |

### SHARE — Compartir con coach

| Codigo             | HTTP | Significado                            | Clave de mensaje         |
| ------------------ | ---- | -------------------------------------- | ------------------------ |
| `BS-SHARE-404-001` | 404  | El acceso compartido no existe         | `errors.share.notFound`  |
| `BS-SHARE-403-002` | 403  | El acceso es de solo lectura           | `errors.share.readOnly`  |
| `BS-SHARE-409-003` | 409  | Ya compartiste esta mira con ese coach | `errors.share.duplicate` |
| `BS-SHARE-403-004` | 403  | El acceso fue revocado                 | `errors.share.revoked`   |

### BILL / SUBS — Cobro y suscripciones

| Codigo            | HTTP | Significado                     | Clave de mensaje                    |
| ----------------- | ---- | ------------------------------- | ----------------------------------- |
| `BS-BILL-402-001` | 402  | El cobro fallo                  | `errors.billing.paymentFailed`      |
| `BS-BILL-400-002` | 400  | Firma de webhook invalida       | `errors.billing.badSignature`       |
| `BS-BILL-409-003` | 409  | Evento de webhook ya procesado  | `errors.billing.duplicateEvent`     |
| `BS-BILL-502-004` | 502  | La pasarela no responde         | `errors.billing.providerDown`       |
| `BS-SUBS-409-001` | 409  | Ya tenes una suscripcion activa | `errors.subscription.alreadyActive` |
| `BS-SUBS-404-002` | 404  | No hay suscripcion              | `errors.subscription.notFound`      |
| `BS-SUBS-409-003` | 409  | Ya usaste tu periodo de prueba  | `errors.subscription.trialUsed`     |

### ENTL — Entitlements y limites

| Codigo            | HTTP | Significado                                           | Clave de mensaje                   |
| ----------------- | ---- | ----------------------------------------------------- | ---------------------------------- |
| `BS-ENTL-403-001` | 403  | Alcanzaste el limite de tu plan                       | `errors.entitlements.limitReached` |
| `BS-ENTL-403-002` | 403  | Esta funcion requiere otro plan                       | `errors.entitlements.planRequired` |
| `BS-ENTL-409-003` | 409  | Tenes mas recursos activos de los que permite el plan | `errors.entitlements.overLimit`    |

🔴 El mensaje de `BS-ENTL-403-001` y `BS-ENTL-403-002` **siempre** dice cual es el tope y que plan lo
levanta: `params` lleva `{ limit, current, requiredPlan }`. Un limite que no dice como salir de el es
una pared, no un upsell.

### CRM

| Codigo           | HTTP | Significado                      | Clave de mensaje                |
| ---------------- | ---- | -------------------------------- | ------------------------------- |
| `BS-CRM-429-001` | 429  | Demasiados envios del formulario | `errors.crm.tooManySubmissions` |

### SYS — Sistema

| Codigo           | HTTP | Significado                                       | Clave de mensaje                    |
| ---------------- | ---- | ------------------------------------------------- | ----------------------------------- |
| `BS-SYS-400-001` | 400  | Validacion fallida                                | `errors.system.validation`          |
| `BS-SYS-404-002` | 404  | Recurso no encontrado                             | `errors.system.notFound`            |
| `BS-SYS-409-003` | 409  | La clave de idempotencia se reuso con otro cuerpo | `errors.system.idempotencyMismatch` |
| `BS-SYS-429-004` | 429  | Demasiadas peticiones                             | `errors.system.rateLimited`         |
| `BS-SYS-500-005` | 500  | Error no controlado                               | `errors.system.internal`            |
| `BS-SYS-503-006` | 503  | Servicio no disponible                            | `errors.system.unavailable`         |
