# PWA — la app del arquero

> Se usa en la linea de tiro. Puerto de desarrollo: **5173**.

## Quien entra

El **arquero (AU)**, con su cuenta. Un **coach (CU)** entra a la misma app y ve, en solo lectura, los
perfiles que le compartieron.

🔴 **Ninguna ruta acepta un `userId`.** Sale de la sesion, siempre. Si lo aceptara, cualquiera podria
pedir las marcas del arquero de al lado.

## Pantallas

| Pantalla            | Ruta                              | Que es                                                                 |
| ------------------- | --------------------------------- | ---------------------------------------------------------------------- |
| **Mis miras**       | `/`                               | Las miras del arquero, con la fijada primero                           |
| **La mira**         | `/sights/:id`                     | **La pantalla estrella**: la regla, la curva, la calculadora y el tape |
| Nueva / editar mira | `/sights/new`, `/sights/:id/edit` | Escala, unidad, arco y set por defecto                                 |
| Equipo              | `/equipment`                      | Setups de arco y sets de flechas                                       |
| Compartido conmigo  | `/shared`                         | Los perfiles que otros le compartieron                                 |
| Plan                | `/plan`                           | Su suscripcion y su uso contra los limites                             |
| Perfil              | `/profile`                        | Email, idioma, unidades y sus datos                                    |

## Decisiones de diseño

- **Mobile first, densidad baja.** Se usa de pie, con guantes, apurado, entre dos tandas. Todo lo
  tocable mide al menos 44x44 px, y el boton de nueva marca queda siempre al alcance del pulgar.
- **La regla es SVG.** Lineas nitidas a cualquier densidad, posicion exacta por coordenadas, y coste
  de render bajo. Minimo arriba, la escala crece hacia abajo, igual que la mira real.
- **Cargar y editar marcas es optimista**, con vuelta atras y el mensaje del error tipado. Esperar
  dos segundos mirando un spinner en la linea de tiro es el peor pecado de este producto.
- **Medido, calculado y consultado se ven distinto.** El calculado va punteado y con `≈`. 🔴
  Presentar una estimacion como una medicion seria mentir sobre lo unico que nos diferencia
  (ADR-001).
- **Se ve sin red, y desde la Fase 3 tambien se escribe sin red.** El campo de tiro no tiene señal.
- **El zoom de las marcas es una preferencia del dispositivo**, no de la cuenta: el telefono viejo
  del bolsillo y la tablet del auto no necesitan el mismo tamaño.
- **La app abre en la mira fijada.** El arquero que esta preparando un torneo entra veinte veces al
  dia a la misma pantalla.

## Sus datos son suyos

En el perfil, a la vista y no escondidos en un mail a soporte:

- **Descargar mis datos**: todo lo que guardamos, en JSON, en el momento.
- **Pedir la baja**: se registra con fecha y la pantalla dice hasta cuando se conservan los datos.

## Errores frecuentes

| Codigo             | Que paso                                   | Que ofrece                                  |
| ------------------ | ------------------------------------------ | ------------------------------------------- |
| `BS-MARK-409-002`  | La marca cae fuera de la escala de la mira | Corregir el valor o ampliar la escala       |
| `BS-ENTL-403-001`  | Se alcanzo el limite del plan              | Decir cual es el tope y que plan lo levanta |
| `BS-MARK-422-004`  | Faltan marcas para calcular                | Cuantas faltan para llegar a cinco          |
| `BS-SIGHT-403-004` | La mira quedo bloqueada al bajar de plan   | Elegir cual queda activa, o volver a Pro    |

El mensaje siempre dice que puede hacer el arquero.
