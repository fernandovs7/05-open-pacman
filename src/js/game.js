// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame
const FRIGHTENED_SPEED = 0.05;
const FRIGHTENED_DURATION = 360;
const GHOST_EATEN_POINTS = [ 200, 400, 800, 1600 ];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) {
    for ( const v of row ) if ( v === 2 || v === 4 ) dots++;
  }

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    roundTick: 0,
    frightenedTicks: 0,
    frightenedChain: 0,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      releaseTick: g.releaseTick,
      mode: 'waiting',
    } ) ),
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function resolveGhostTarget( grid, targetX, targetY ) {
  const target = { x: Math.round( targetX ), y: Math.round( targetY ) };
  if ( !isWall( grid, target.x, target.y, 'ghost' ) ) return target;

  let nearest = null;
  let nearestDistance = Infinity;

  for ( let y = 0; y < grid.length; y++ ) {
    for ( let x = 0; x < grid[ y ].length; x++ ) {
      if ( isWall( grid, x, y, 'ghost' ) ) continue;

      const distance = Math.abs( x - target.x ) + Math.abs( y - target.y );
      if ( distance < nearestDistance ) {
        nearest = { x, y };
        nearestDistance = distance;
      }
    }
  }

  return nearest;
}

function getGhostChoices( grid, g ) {
  const valid = Object.keys( DIRS ).filter(
    ( dir ) => canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  const forward = valid.filter( ( dir ) => dir !== OPPOSITE[ g.dir ] );
  return forward.length ? forward : valid;
}

function findShortestDirection( grid, startX, startY, targetX, targetY, firstDirections = Object.keys( DIRS ) ) {
  const width = grid[ 0 ].length;
  const start = { x: Math.round( startX ), y: Math.round( startY ) };
  const target = { x: Math.round( targetX ), y: Math.round( targetY ) };

  if ( start.x === target.x && start.y === target.y ) return null;

  const queue = [ { x: start.x, y: start.y, firstDir: null } ];
  const visited = new Set( [ `${ start.x },${ start.y }` ] );

  for ( let i = 0; i < queue.length; i++ ) {
    const cell = queue[ i ];

    for ( const dir of Object.keys( DIRS ) ) {
      if ( i === 0 && !firstDirections.includes( dir ) ) continue;
      if ( !canMove( grid, cell.x, cell.y, dir, 'ghost' ) ) continue;

      const d = DIRS[ dir ];
      let x = cell.x + d.x;
      const y = cell.y + d.y;
      if ( y === TUNNEL_ROW ) {
        if ( x < 0 ) x = width - 1;
        else if ( x >= width ) x = 0;
      }

      const key = `${ x },${ y }`;
      if ( visited.has( key ) ) continue;

      const firstDir = cell.firstDir || dir;
      if ( x === target.x && y === target.y ) return firstDir;

      visited.add( key );
      queue.push( { x, y, firstDir } );
    }
  }

  return null;
}

function activateFrightenedMode( game ) {
  game.frightenedTicks = FRIGHTENED_DURATION;
  game.frightenedChain = 0;

  for ( const g of game.ghosts ) {
    if ( g.mode !== 'active' ) continue;
    g.mode = 'frightened';
    g.dir = OPPOSITE[ g.dir ];
    g.speed = FRIGHTENED_SPEED;
  }
}

function updateFrightenedMode( game ) {
  if ( game.frightenedTicks <= 0 ) return;

  game.frightenedTicks--;
  if ( game.frightenedTicks > 0 ) return;

  for ( const g of game.ghosts ) {
    if ( g.mode !== 'frightened' ) continue;
    g.mode = 'active';
    g.speed = GHOST_SPEED;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot o power pellet antes de mover fantasmas y resolver colisiones.
    const tile = grid[ p.y ][ p.x ];
    if ( tile === 2 || tile === 4 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += tile === 4 ? 50 : 10;
      game.dotsRemaining--;
      if ( tile === 4 ) activateFrightenedMode( game );
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

function decideGhost( game, g ) {
  const grid = game.grid;
  const p = game.pacman;
  const choices = getGhostChoices( grid, g );
  if ( !choices.length ) return;

  if ( g.kind === 'random' ) {
    g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
    return;
  }

  const px = Math.round( p.x );
  const py = Math.round( p.y );
  let targetX = px;
  let targetY = py;

  if ( g.kind === 'ambusher' ) {
    const d = DIRS[ p.dir ];
    targetX += d.x * 4;
    targetY += d.y * 4;
  } else if ( g.kind === 'patrol' ) {
    const distance = Math.abs( g.x - px ) + Math.abs( g.y - py );
    if ( distance <= 8 ) {
      targetX = 26;
      targetY = 29;
    }
  }

  const target = resolveGhostTarget( grid, targetX, targetY );
  g.dir = findShortestDirection( grid, g.x, g.y, target.x, target.y, choices ) || choices[ 0 ];
}

function moveGhost( game, g, index ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( g.mode === 'waiting' ) {
    if ( game.roundTick < g.releaseTick ) return;
    g.mode = 'exiting';
  }

  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    let recovered = false;

    if ( g.mode === 'eaten' ) {
      const start = GHOST_STARTS[ index ];
      g.speed = GHOST_SPEED;
      if ( g.x === start.x && g.y === start.y ) {
        g.mode = 'exiting';
        g.dir = findShortestDirection( grid, g.x, g.y, 13, 11 );
        recovered = true;
      } else {
        g.dir = findShortestDirection( grid, g.x, g.y, start.x, start.y );
      }
    }

    if ( g.mode === 'exiting' ) {
      if ( g.x === 13 && g.y === 11 ) {
        g.mode = 'active';
        g.speed = GHOST_SPEED;
        return;
      }
      if ( !recovered ) {
        const choices = getGhostChoices( grid, g );
        g.dir = findShortestDirection( grid, g.x, g.y, 13, 11, choices );
      }
    } else if ( g.mode === 'frightened' ) {
      // En el tick de activacion conserva la inversion antes de decidir al azar.
      if ( game.frightenedTicks !== FRIGHTENED_DURATION ) {
        const choices = getGhostChoices( grid, g );
        if ( choices.length ) {
          g.dir = choices[ Math.floor( Math.random() * choices.length ) ];
        }
      }
    } else if ( g.mode === 'active' ) {
      decideGhost( game, g );
    }

    if ( !g.dir ) return;
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.roundTick = 0;
  game.frightenedTicks = 0;
  game.frightenedChain = 0;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.speed = GHOST_SPEED;
    g.mode = 'waiting';
  } );
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

function update( game ) {
  updateFrightenedMode( game );
  movePacman( game );
  game.ghosts.forEach( ( g, i ) => moveGhost( game, g, i ) );
  game.roundTick++;

  for ( const g of game.ghosts ) {
    if ( !collides( game.pacman, g ) || g.mode === 'eaten' ) continue;

    if ( g.mode === 'frightened' ) {
      const pointsIndex = Math.min( game.frightenedChain, GHOST_EATEN_POINTS.length - 1 );
      game.score += GHOST_EATEN_POINTS[ pointsIndex ];
      game.frightenedChain = Math.min( game.frightenedChain + 1, GHOST_EATEN_POINTS.length );
      g.mode = 'eaten';
      g.speed = GHOST_SPEED;
      continue;
    }

    game.frightenedTicks = 0;
    game.frightenedChain = 0;
    game.lives--;
    if ( game.lives <= 0 ) {
      game.state = 'lost';
      return;
    }
    resetPositions( game );
    break;
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
