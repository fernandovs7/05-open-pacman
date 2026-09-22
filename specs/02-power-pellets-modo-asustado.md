# SPEC 02 — Power pellets y modo asustado

> **Estado:** Approved
> **Depende de:** SPEC 01
> **Fecha:** 2026-09-22
> **Objetivo:** Incorporar cuatro power pellets que permitan a Pac-Man asustar y comer temporalmente a los cuatro fantasmas.

## Alcance

**Incluido:**

- Cuatro power pellets en las coordenadas `(1, 3)`, `(26, 3)`, `(1, 23)` y `(26, 23)`.
- Sustitución de los dots existentes en esas cuatro celdas por power pellets con valor de tile `4`.
- Representación de cada power pellet como un círculo grande que alterna 30 frames visible y 30 frames oculto.
- Concesión de 50 puntos al consumir cada power pellet.
- Inclusión de los power pellets pendientes en la condición de victoria.
- Modo asustado de 360 actualizaciones para los fantasmas que estén en modo `active` al consumir el power pellet.
- Inversión inmediata de la dirección de los fantasmas afectados al comenzar el modo asustado.
- Movimiento aleatorio a `0.05` celdas por actualización durante el modo asustado.
- Representación azul de los fantasmas asustados y alternancia azul/blanco cada 15 ticks durante los últimos 120 ticks.
- Puntuación progresiva de 200, 400, 800 y 1600 puntos por comer fantasmas durante un mismo modo asustado.
- Regreso mediante BFS de cada fantasma comido a su posición correspondiente en `GHOST_STARTS`, con apariencia de ojos, velocidad de `0.1` celdas por actualización y sin colisiones peligrosas.
- Salida inmediata del corral mediante BFS después de que un fantasma comido alcance su posición inicial.
- Reinicio de la duración y de la cadena de puntos cuando se consume otro power pellet.
- Cancelación del modo asustado y de su cadena de puntos cuando Pac-Man pierde una vida.

**Fuera de alcance (para futuras especificaciones):**

- Restaurar power pellets consumidos después de perder una vida.
- Afectar a fantasmas que estén esperando, saliendo o regresando al corral cuando se consume un power pellet.
- Acumular la duración de varios power pellets.
- Reproducir tiempos o velocidades variables según el nivel del arcade original.
- Añadir niveles, dificultad progresiva, sonidos o persistencia entre sesiones.
- Mostrar textos flotantes con los puntos obtenidos al comer un fantasma.

## Modelo de datos

`src/js/maze.js` ampliará los valores de tile con `4` para representar un power pellet. Las cuatro posiciones quedarán incorporadas directamente en `MAZE_STR` y reemplazarán los dots existentes.

```js
// Tiles del laberinto:
// 0 = transitable, 1 = pared, 2 = dot, 3 = puerta, 4 = power pellet
```

`createGame()` ampliará el estado mutable de la partida:

```js
const game = {
  frightenedTicks: 0,
  frightenedChain: 0,
  // Estado existente omitido.
};
```

El campo `mode` de cada fantasma admitirá dos estados adicionales:

```js
const ghost = {
  mode: "frightened", // También: waiting, exiting, active o eaten.
  // Estado existente omitido.
};
```

Convenciones:

- `frightenedTicks` contiene las actualizaciones restantes del modo asustado y admite valores entre `0` y `360`.
- `frightenedChain` contiene cuántos fantasmas han sido comidos desde el último power pellet y admite valores entre `0` y `4`.
- Consumir un power pellet establece `frightenedTicks` en `360` y `frightenedChain` en `0`, aunque ya exista un modo asustado activo.
- Solo los fantasmas cuyo `mode` sea `active` en ese instante pasan a `frightened`.
- Los fantasmas en `waiting`, `exiting` o `eaten` conservan su estado y no se vuelven comestibles.
- Un fantasma `frightened` usa una velocidad de `0.05`; un fantasma `eaten` usa una velocidad de `0.1`.
- Al agotarse `frightenedTicks`, cada fantasma `frightened` vuelve a `active`, recupera su velocidad normal y retoma su IA en la siguiente decisión de movimiento.
- Un fantasma `eaten` es inofensivo, no concede puntos adicionales y busca mediante BFS su propia coordenada en `GHOST_STARTS`.
- Al alcanzar su posición inicial, un fantasma `eaten` pasa directamente a `exiting` y calcula mediante BFS su ruta hacia `(13, 11)` sin repetir `releaseTick`.
- Un fantasma recuperado sale en estado normal aunque todavía queden ticks del modo asustado global.
- Las coordenadas conservan el origen en la esquina superior izquierda.
- Los power pellets comparten el conteo `dotsRemaining` con los dots normales; cada tile `2` o `4` pendiente cuenta como un coleccionable.
- No se añade persistencia ni se modifica un esquema de guardado porque el juego no guarda partidas.

## Plan de implementación

1. Modificar `MAZE_STR` y `parseTile()` en `src/js/maze.js` para representar con el tile `4` los power pellets de `(1, 3)`, `(26, 3)`, `(1, 23)` y `(26, 23)` sin alterar las dimensiones ni la transitabilidad del tablero.
2. Actualizar `createGame()` y la recolección de tiles en `src/js/game.js` para contabilizar dots y power pellets, conceder 50 puntos por cada power pellet e iniciar o reiniciar `frightenedTicks`, `frightenedChain` y los modos afectados antes de resolver colisiones.
3. Ampliar el movimiento de fantasmas en `src/js/game.js` con los modos `frightened` y `eaten`: giro inicial, decisiones aleatorias a velocidad reducida, finalización del temporizador, regreso BFS a la posición propia y salida inmediata mediante la ruta existente hacia `(13, 11)`.
4. Adaptar las colisiones y `resetPositions()` en `src/js/game.js` para aplicar la secuencia 200, 400, 800 y 1600, hacer inofensivos a los fantasmas `eaten`, conservar los coleccionables consumidos y cancelar el efecto al perder una vida.
5. Actualizar `src/js/render.js` para dibujar power pellets grandes con ciclos de 30 frames, fantasmas asustados en azul con aviso azul/blanco cada 15 ticks durante los últimos 120 ticks y fantasmas `eaten` únicamente como ojos.

## Criterios de aceptación

- [ ] El tablero conserva 28 columnas y 31 filas.
- [ ] Las coordenadas `(1, 3)`, `(26, 3)`, `(1, 23)` y `(26, 23)` contienen el tile `4` al crear una partida.
- [ ] No existe ningún otro tile `4` en el tablero inicial.
- [ ] Cada power pellet pendiente cuenta para `dotsRemaining` y debe consumirse para ganar.
- [ ] Cada power pellet se dibuja con un radio mayor que el de un dot normal.
- [ ] Cada power pellet alterna exactamente 30 frames visible y 30 frames oculto sin dejar de ser consumible mientras está oculto.
- [ ] Consumir un power pellet elimina su tile, reduce `dotsRemaining` en uno y suma exactamente 50 puntos.
- [ ] Consumir un power pellet establece `frightenedTicks` en `360` y `frightenedChain` en `0`.
- [ ] Solo los fantasmas que están `active` al consumir el power pellet pasan a `frightened`.
- [ ] Los fantasmas afectados invierten inmediatamente su dirección.
- [ ] Un fantasma `frightened` elige al azar entre sus direcciones válidas y se mueve a `0.05` celdas por actualización.
- [ ] Un fantasma `frightened` se dibuja azul mientras quedan más de 120 ticks.
- [ ] Durante los últimos 120 ticks, un fantasma `frightened` alterna azul y blanco cada 15 ticks.
- [ ] Al llegar `frightenedTicks` a `0`, los fantasmas `frightened` vuelven a `active`, recuperan la velocidad `0.1` y esperan hasta su siguiente decisión alineada para retomar su IA normal.
- [ ] Si Pac-Man consume un power pellet y coincide con un fantasma activo en la misma actualización, primero se activa el modo asustado y Pac-Man come al fantasma.
- [ ] Los cuatro primeros fantasmas comidos durante un mismo modo asustado conceden exactamente 200, 400, 800 y 1600 puntos, respectivamente.
- [ ] Consumir otro power pellet durante el efecto reinicia la duración en 360 ticks y la cadena de puntuación en 0, sin acumular tiempo.
- [ ] Un fantasma comido pasa a `eaten`, se dibuja solo como ojos y se mueve a `0.1` celdas por actualización.
- [ ] Colisionar con un fantasma `eaten` no quita vidas ni concede puntos.
- [ ] Cada fantasma `eaten` usa BFS para regresar a su propia posición definida en `GHOST_STARTS`.
- [ ] Al alcanzar su posición inicial, el fantasma inicia inmediatamente la ruta BFS hacia `(13, 11)` sin repetir su `releaseTick`.
- [ ] Un fantasma recuperado sale en estado normal aunque el temporizador global siga activo.
- [ ] Los fantasmas en `waiting`, `exiting` o `eaten` al consumirse un power pellet no cambian de modo.
- [ ] Perder una vida establece `frightenedTicks` y `frightenedChain` en `0` y restaura los modos, velocidades y posiciones iniciales de los fantasmas.
- [ ] Perder una vida no restaura dots ni power pellets consumidos y no reinicia la puntuación.
- [ ] Consumir todos los dots y power pellets activa el estado de victoria.
- [ ] Las colisiones normales, vidas, derrota, reinicio, puerta del corral y túnel conservan su comportamiento existente.
- [ ] `node --check src/js/*.js` termina sin errores.
- [ ] El juego servido con `python3 -m http.server 8000 --directory src` carga y se ejecuta sin errores en la consola del navegador.

## Decisiones

- **Sí:** tile `4` dentro de `game.grid`. Mantiene todos los coleccionables en la estructura mutable que ya consume y renderiza el juego.
- **No:** lista separada de coordenadas. Duplicaría el estado del tablero y complicaría la condición de victoria.
- **Sí:** posiciones arcade `(1, 3)`, `(26, 3)`, `(1, 23)` y `(26, 23)`. Son celdas transitables con dots existentes y están distribuidas cerca de las cuatro esquinas jugables.
- **Sí:** 50 puntos por power pellet y secuencia 200, 400, 800 y 1600 por fantasmas. Son los valores clásicos y producen criterios exactos.
- **Sí:** temporizador de 360 actualizaciones. Equivale aproximadamente a seis segundos en el bucle actual basado en unas 60 actualizaciones por segundo.
- **Sí:** reiniciar, en lugar de acumular, el temporizador y la cadena al consumir otro power pellet. Evita duraciones encadenadas y conserva rondas de puntuación independientes.
- **Sí:** afectar únicamente a fantasmas `active`. Los fantasmas dentro del corral o en transición no interrumpen su recorrido ni se vuelven comestibles.
- **Sí:** giro inmediato al activarse el modo asustado. Comunica el cambio de estado antes de la siguiente intersección.
- **Sí:** movimiento aleatorio a mitad de velocidad. Distingue el modo asustado de las conductas normales sin añadir otra búsqueda de rutas.
- **No:** huida mediante BFS. Añadiría una estrategia nueva que no es necesaria para el efecto aprobado.
- **Sí:** prioridad del power pellet sobre la colisión en la misma actualización. El coleccionable debe proteger a Pac-Man desde el instante en que se consume.
- **Sí:** regreso BFS a la posición propia de `GHOST_STARTS`, seguido de salida inmediata. Reutiliza la navegación existente y conserva la identidad de cada fantasma.
- **Sí:** ojos inofensivos a velocidad normal durante el regreso. Evita tanto una segunda puntuación como una pérdida de vida causada por un fantasma ya comido.
- **No:** repetir `releaseTick` después del regreso. El retraso pertenece al inicio de la ronda, no a la recuperación de un fantasma.
- **Sí:** salida recuperada en estado normal aunque continúe el efecto global. Solo los fantasmas activos en el momento de consumir el pellet quedan asustados.
- **Sí:** parpadeo de pellets en bloques de 30 frames y aviso azul/blanco en bloques de 15 ticks. Define cadencias observables y verificables.
- **No:** persistencia. El tablero y los temporizadores pertenecen exclusivamente a la partida activa.

## Riesgos

| Riesgo                                                                                                           | Mitigación                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Un cambio de modo a mitad de celda puede romper la alineación si también cambia la velocidad.                    | Usar velocidades que dividen exactamente las distancias recorridas y conservar la coordenada continua al invertir la dirección. |
| El orden entre recolección, movimiento y colisión puede hacer que Pac-Man pierda una vida sobre un power pellet. | Aplicar el consumo y el cambio a `frightened` antes de resolver las colisiones de esa actualización.                            |
| Un fantasma comido puede heredar una velocidad o un color incorrectos al cambiar de modo.                        | Asignar explícitamente velocidad y representación a cada transición entre `active`, `frightened`, `eaten` y `exiting`.          |
| Un segundo power pellet puede alterar fantasmas que ya regresan o salen del corral.                              | Cambiar únicamente fantasmas cuyo modo sea exactamente `active` al consumirlo.                                                  |
| El conteo de victoria puede terminar antes de consumir los cuatro power pellets.                                 | Inicializar `dotsRemaining` contando tanto tiles `2` como tiles `4` y reducirlo al consumir cualquiera de ellos.                |

## Lo que **no** está en esta especificación

- Restauración de power pellets después de perder una vida.
- Modo asustado para fantasmas que no estén activos al consumir el pellet.
- Acumulación de tiempo entre power pellets.
- Tiempos, velocidades o puntuaciones variables según el nivel.
- Nuevos niveles, dificultad progresiva, sonidos o persistencia.
- Textos flotantes de puntuación.

Cada una de estas capacidades requerirá su propia especificación si se incorpora en el futuro.
