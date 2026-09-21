# SPEC 01 — Cuatro fantasmas con conductas diferenciadas

> **Estado:** Approved
> **Depende de:** Ninguna
> **Fecha:** 2026-09-21
> **Objetivo:** Incorporar cuatro fantasmas identificables por color, con salidas escalonadas y conductas distintas, incluido un perseguidor agresivo que calcule la ruta más corta hacia Pac-Man.

## Alcance

**Incluido:**

- Cuatro fantasmas: rojo perseguidor, rosa emboscador, cian patrullero y naranja errático.
- Posiciones iniciales distintas dentro del corral y retrasos de salida de 0, 120, 240 y 360 actualizaciones.
- Una ruta de salida explícita desde el corral hasta la celda exterior `(13, 11)`.
- Búsqueda en anchura (BFS) para elegir rutas hacia objetivos.
- Corrección de objetivos inválidos hacia la celda transitable más cercana.
- Reinicio de posiciones, estados y retrasos de salida después de perder una vida.
- Asociación explícita entre cada `kind` y su color clásico.
- Conservación de la velocidad actual de `0.1` celdas por actualización para los cuatro fantasmas.

**Fuera de alcance (para futuras especificaciones):**

- Power pellets y modo asustado o comestible.
- Puntuación por comer fantasmas.
- Dificultad progresiva o niveles adicionales.
- Reproducción exacta de los modos `scatter` y `chase` del arcade original.
- Nombres, objetivos o información de depuración dibujados en pantalla.
- Persistencia entre sesiones.

## Modelo de datos

`src/js/maze.js` definirá los cuatro elementos de `GHOST_STARTS` en el mismo orden en que se crearán los fantasmas:

```js
const GHOST_STARTS = [
  { x: 13, y: 14, kind: 'hunter', releaseTick: 0 },
  { x: 14, y: 14, kind: 'ambusher', releaseTick: 120 },
  { x: 12, y: 14, kind: 'patrol', releaseTick: 240 },
  { x: 15, y: 14, kind: 'random', releaseTick: 360 },
];
```

`createGame()` ampliará el estado mutable de la ronda y de cada fantasma:

```js
const game = {
  roundTick: 0,
  ghosts: [
    {
      x: 13,
      y: 14,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: 'hunter',
      releaseTick: 0,
      mode: 'waiting',
    },
  ],
};
```

Convenciones:

- `roundTick` aumenta una vez por llamada a `update()` mientras la partida está activa y vuelve a `0` después de perder una vida.
- `mode` solo admite `waiting`, `exiting` y `active`.
- El retraso se mide suponiendo 60 actualizaciones por segundo, de modo que 120 ticks representan aproximadamente 2 segundos.
- Las coordenadas conservan el origen en la esquina superior izquierda.
- La celda exterior de salida es `(13, 11)` y la esquina del patrullero es `(26, 29)`.
- Los objetivos de Pac-Man y los fantasmas se calculan con coordenadas de celda redondeadas.
- No se añade persistencia ni se modifica el esquema de guardado porque el juego no guarda partidas.

## Plan de implementación

1. Ampliar `GHOST_STARTS` en `src/js/maze.js` con los cuatro tipos, posiciones y ticks de salida; adaptar `createGame()` para copiar esos datos y crear los cuatro fantasmas sin alterar las reglas existentes.
2. Añadir en `src/js/game.js` una búsqueda BFS reutilizable que recorra celdas válidas para fantasmas, contemple la puerta y el túnel, y devuelva la primera dirección de una ruta más corta.
3. Añadir la resolución de objetivos inválidos seleccionando la celda transitable con menor distancia Manhattan al objetivo teórico; los empates seguirán un orden fijo para evitar decisiones inestables.
4. Incorporar `roundTick` y los modos `waiting`, `exiting` y `active`; al cumplirse su `releaseTick`, cada fantasma navegará por BFS hasta `(13, 11)` antes de usar su conducta normal.
5. Implementar las conductas activas: `hunter` buscará la celda actual de Pac-Man; `ambusher` buscará cuatro celdas por delante de su dirección; `patrol` buscará a Pac-Man cuando esté a más de 8 celdas Manhattan y `(26, 29)` cuando esté a 8 o menos; `random` elegirá una dirección válida al azar.
6. Mantener la prohibición actual de invertir dirección inmediatamente, excepto cuando no exista otra salida, y permitir que el túnel forme parte de las rutas BFS.
7. Actualizar `resetPositions()` para restaurar coordenadas, dirección, `mode` y `roundTick` sin modificar puntos, dots restantes ni las vidas que queden.
8. Cambiar `src/js/render.js` para resolver el color mediante `kind` en lugar de la posición del fantasma en el arreglo: rojo para `hunter`, rosa para `ambusher`, cian para `patrol` y naranja para `random`.

## Criterios de aceptación

- [ ] La partida crea exactamente cuatro fantasmas en las posiciones definidas por `GHOST_STARTS`.
- [ ] El perseguidor rojo inicia su salida en el tick 0.
- [ ] Los fantasmas rosa, cian y naranja permanecen esperando hasta los ticks 120, 240 y 360, respectivamente.
- [ ] Cada fantasma alcanza `(13, 11)` antes de activar su conducta normal.
- [ ] El fantasma rojo elige en cada decisión una dirección perteneciente a una ruta BFS más corta hacia la celda actual de Pac-Man.
- [ ] El fantasma rosa apunta a una celda situada cuatro posiciones por delante de Pac-Man según su dirección actual.
- [ ] El fantasma cian persigue a Pac-Man cuando su distancia Manhattan es mayor que 8 y apunta a `(26, 29)` cuando es 8 o menor.
- [ ] El fantasma naranja elige al azar entre las direcciones válidas disponibles.
- [ ] Un objetivo que esté en una pared o fuera del tablero se sustituye por la celda transitable más cercana.
- [ ] Ningún fantasma invierte inmediatamente su dirección mientras exista otra salida válida.
- [ ] Los cuatro fantasmas conservan una velocidad de `0.1` celdas por actualización.
- [ ] Después de perder una vida, los cuatro fantasmas vuelven a sus posiciones iniciales y reinician la secuencia de salida desde el tick 0.
- [ ] Perder una vida no restaura los dots consumidos ni reinicia la puntuación.
- [ ] Los colores visibles corresponden a rojo `hunter`, rosa `ambusher`, cian `patrol` y naranja `random`.
- [ ] Pac-Man continúa sin poder atravesar la puerta del corral y los fantasmas sí pueden atravesarla.
- [ ] Los fantasmas pueden usar el túnel sin salir de los límites válidos del tablero.
- [ ] Las colisiones, vidas, victoria, derrota y reinicio conservan su comportamiento existente.
- [ ] `node --check src/js/*.js` termina sin errores.
- [ ] El juego servido con `python3 -m http.server 8000 --directory src` carga y se ejecuta sin errores en la consola del navegador.

## Decisiones

- **Sí:** cuatro conductas clásicas simplificadas. Hacen que los fantasmas sean distinguibles sin reproducir toda la máquina de estados arcade.
- **Sí:** BFS para el perseguidor, el emboscador, el patrullero y la salida del corral. La ruta real por el laberinto expresa mejor una persecución agresiva que la distancia Manhattan local.
- **No:** aumentar la velocidad del perseguidor. La agresividad vendrá de su ruta y no de una ventaja de velocidad.
- **Sí:** retrasos de 0, 2, 4 y 6 segundos representados por 0, 120, 240 y 360 actualizaciones. El juego actual ya basa su movimiento en actualizaciones y no en tiempo transcurrido.
- **No:** introducir tiempo real en `main.js`. Ampliaría la integración sin corregir el resto del movimiento, que también depende de la tasa de actualización.
- **Sí:** salida explícita hacia `(13, 11)`. Evita que una conducta activa mantenga a un fantasma dentro del corral.
- **Sí:** distancia Manhattan para el umbral de 8 celdas del patrullero. Es estable y suficiente para decidir entre persecución y retirada.
- **Sí:** esquina inferior derecha `(26, 29)` para la retirada del patrullero. Es una celda transitable y proporciona un objetivo fijo verificable.
- **Sí:** colores asociados por `kind` en `render.js`. Conserva las posiciones aprobadas sin depender del orden del arreglo de renderizado.
- **No:** interfaz de depuración. Las conductas se verificarán mediante observación y el estado disponible en la consola.
- **No:** persistencia. Todos los datos nuevos pertenecen únicamente a la partida activa.

## Riesgos

| Riesgo | Mitigación |
| --- | --- |
| Ejecutar BFS para varios fantasmas en cada intersección puede añadir trabajo al bucle. | Limitar la búsqueda a las 868 celdas del tablero y ejecutarla solo cuando el fantasma está alineado con una celda. |
| Dos rutas mínimas pueden producir cambios aparentemente arbitrarios. | Usar un orden fijo de direcciones para resolver empates. |
| Un fantasma puede quedar sin opciones al excluir la dirección opuesta. | Permitir el giro de 180 grados únicamente cuando no haya otra salida, como en la lógica actual. |
| La temporización depende de una tasa aproximada de 60 actualizaciones por segundo. | Documentar que los retrasos se expresan en ticks y mantener este cambio coherente con el movimiento existente basado en frames. |

## Lo que **no** está en esta especificación

- Power pellets, modo asustado y fantasmas comestibles.
- Puntuación por comer fantasmas.
- Dificultad progresiva o niveles nuevos.
- IA arcade exacta con ciclos globales de dispersión y persecución.
- Etiquetas, nombres u objetivos visibles de depuración.
- Persistencia entre sesiones.

Cada una de estas capacidades requerirá su propia especificación si se incorpora en el futuro.
