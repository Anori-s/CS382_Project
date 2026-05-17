

let GHOST_SPEED_NORMAL        = 3.5;  // tiles per second (normal)
const GHOST_SPEED_FRIGHTENED = 2.0;  // tiles per second (frightened — slower)
const GHOST_SPEED_EATEN      = 6.0;  // tiles per second (eaten — rushing home)
const GHOST_SPEED_HOUSE      = 1.5;  // tiles per second (bouncing in house)

const FRIGHTENED_DURATION = 8000;   // ms power pellet lasts
const FLASH_START         = 2000;   // ms before end to start flashing
const SCATTER_DURATION    = 7000;   // ms ghosts scatter before chasing
const CHASE_DURATION      = 20000;  // ms ghosts chase before scattering


const HOUSE_DOOR = { col: 13, row: 11 };


const SCATTER_TARGETS = {
  blinky: { col: 25, row: 0  },
  pinky:  { col: 2,  row: 0  },
  inky:   { col: 27, row: 29 },
  clyde:  { col: 0,  row: 29 },
};

// Ghost start positions inside the house 
const GHOST_STARTS = {
  blinky: { col: 13, row: 11, outsideHouse: true  }, // Blinky starts outside
  pinky:  { col: 13, row: 14, outsideHouse: false },
  inky:   { col: 11, row: 14, outsideHouse: false },
  clyde:  { col: 15, row: 14, outsideHouse: false },
};

// Release delays after a life starts 
const RELEASE_DELAYS = {
  blinky: 0,
  pinky:  3000,
  inky:   6000,
  clyde:  9000,
};

// Score for eating ghosts 
const GHOST_EAT_BASE  = 200;
let ghostEatCombo     = 0; // reset when power pellet wears off


// Each ghost can be in one of these states:
//   'house'      — bouncing inside the ghost house, waiting to exit
//   'exiting'    — moving up and out through the house door
//   'scatter'    — retreating to their corner
//   'chase'      — using their unique AI to target Pac-Man
//   'frightened' — blue, slow, random movement
//   'eaten'      — just eyes, rushing back to ghost house


let ghosts = [];

function createGhost(name, color, eyeColor) {
  const start = GHOST_STARTS[name];
  return {
    name,
    color,
    eyeColor,

    // Position in tile coords
    x: start.col,
    y: start.row,

    // Current movement direction vector
    dir: { x: 0, y: -1 },

    // Queued next direction 
    nextDir: null,

    // State
    state: start.outsideHouse ? 'scatter' : 'house',


    houseMoveDir: 1,           // +1 down, -1 up

    // Frightened flash toggle
    flashOn: false,

    // Timer for house bouncing before release
    releaseTimer: RELEASE_DELAYS[name],

    // Whether this ghost has been released this life
    released: start.outsideHouse,

   
    targetTile: { col: 0, row: 0 },
  };
}

function initGhosts() {
  ghosts = [
    createGhost('blinky', '#FF0000', '#222'),
    createGhost('pinky',  '#FFB8FF', '#222'),
    createGhost('inky',   '#00FFFF', '#222'),
    createGhost('clyde',  '#FFB852', '#222'),
  ];
  ghostEatCombo = 0;
  startScatterChaseTimer();
}



let scatterChaseTimer  = 0;
let scatterChasePhase  = 'scatter'; 
let scatterChaseHandle = null;

function startScatterChaseTimer() {
  clearTimeout(scatterChaseHandle);
  scatterChasePhase = 'scatter';
  scatterChaseHandle = setTimeout(flipScatterChase, SCATTER_DURATION);
}

function flipScatterChase() {
  if (scatterChasePhase === 'scatter') {
    scatterChasePhase = 'chase';
    scatterChaseHandle = setTimeout(flipScatterChase, CHASE_DURATION);
  } else {
    scatterChasePhase = 'scatter';
    scatterChaseHandle = setTimeout(flipScatterChase, SCATTER_DURATION);
  }
  // Apply new phase to all non-frightened, non-eaten, non-house ghosts
  ghosts.forEach(g => {
    if (g.state === 'scatter' || g.state === 'chase') {
      g.state = scatterChasePhase;
      reverseDirection(g);  // ghosts reverse when mode flips
    }
  });
}

function reverseDirection(ghost) {
  ghost.dir = { x: -ghost.dir.x, y: -ghost.dir.y };
}


let frightenedTimer    = null;
let flashTimer         = null;
let frightenedActive   = false;

function activateFrightened() {
  frightenedActive = true;
  ghostEatCombo    = 0;


  ghosts.forEach(g => {
    if (g.state === 'scatter' || g.state === 'chase') {
      g.state   = 'frightened';
      g.flashOn = false;
      reverseDirection(g);
    }
  });

  // Clear any existing timers
  clearTimeout(frightenedTimer);
  clearTimeout(flashTimer);

  // Start flashing near the end
  flashTimer = setTimeout(() => {
    ghosts.forEach(g => { if (g.state === 'frightened') g.flashOn = true; });
  }, FRIGHTENED_DURATION - FLASH_START);

  // End frightened mode
  frightenedTimer = setTimeout(() => {
    frightenedActive = false;
    ghosts.forEach(g => {
      if (g.state === 'frightened') {
        g.state   = scatterChasePhase;
        g.flashOn = false;
      }
    });
  }, FRIGHTENED_DURATION);
}


// This part for respawn (call on new life)


function respawnGhosts() {
  clearTimeout(frightenedTimer);
  clearTimeout(flashTimer);
  clearTimeout(scatterChaseHandle);
  frightenedActive = false;
  initGhosts();
}


//  Utility — tile / pixel helpers


function tileToPixel(tileCoord) {
  return tileCoord * TILE_SIZE + TILE_SIZE / 2;
}

function pixelToTile(px) {
  return px / TILE_SIZE;
}

function atTileCentre(coord) {
  return Math.abs(coord - Math.round(coord)) < 0.15;
}


// Ghosts can't go UP through the house door unless exiting/eaten
function canGhostMove(col, row, ghost) {
  if (row < 0 || row >= maze.length)    return false;
  if (col < 0 || col >= maze[0].length) return false;
  const tile = maze[row][col];
  if (tile === TILE.WALL) return false;
  return true;
}


function distSq(ax, ay, bx, by) {
  return (ax - bx) ** 2 + (ay - by) ** 2;
}

// Get valid next directions for a ghost at its current tile centre

function getValidDirs(ghost, excludeReverse) {
  const col = Math.round(ghost.x);
  const row = Math.round(ghost.y);
  const dirs = [
    { x: 0,  y: -1 }, // up
    { x: 0,  y:  1 }, // down
    { x: -1, y:  0 }, // left
    { x:  1, y:  0 }, // right
  ];
  return dirs.filter(d => {
    if (excludeReverse && d.x === -ghost.dir.x && d.y === -ghost.dir.y) return false;
    return canGhostMove(col + d.x, row + d.y, ghost);
  });
}


// 8. Target tile logic — the heart of each ghost's personality

function getTargetTile(ghost) {
  const px = Math.round(player.x);
  const py = Math.round(player.y);

  switch (ghost.name) {

    // BLINKY — Red — Direct chaser
    // Target: Pac-Man's exact tile
    case 'blinky':
      return { col: px, row: py };

    // PINKY — Pink — Ambusher
    // Target: 4 tiles ahead of Pac-Man's current direction
    case 'pinky': {
      return {
        col: px + player.dir.x * 4,
        row: py + player.dir.y * 4,
      };
    }

    // INKY — Cyan — Flanker (most complex)
    // 1. Take the tile 2 ahead of Pac-Man
    // 2. Draw a vector from Blinky to that tile
    // 3. Double the vector — that's Inky's target
    case 'inky': {
      const blinky = ghosts.find(g => g.name === 'blinky');
      const bx = Math.round(blinky.x);
      const by = Math.round(blinky.y);
      const pivotCol = px + player.dir.x * 2;
      const pivotRow = py + player.dir.y * 2;
      return {
        col: pivotCol + (pivotCol - bx),
        row: pivotRow + (pivotRow - by),
      };
    }

    // CLYDE — Orange — Shy / random-ish
    // If more than 8 tiles from Pac-Man: chase like Blinky
    // If within 8 tiles: retreat to scatter corner (bottom-left)
    case 'clyde': {
      const dist = Math.sqrt(distSq(ghost.x, ghost.y, px, py));
      if (dist > 8) {
        return { col: px, row: py };
      } else {
        return SCATTER_TARGETS.clyde;
      }
    }

    default:
      return { col: px, row: py };
  }
}

// Direction choosing — minimise distance to target tile


function chooseDirToward(ghost, target) {
  const validDirs = getValidDirs(ghost, true);
  if (!validDirs.length) return ghost.dir; 

  const col = Math.round(ghost.x);
  const row = Math.round(ghost.y);

  // Pick the direction whose next tile is closest to target
  let best    = null;
  let bestDist = Infinity;

  validDirs.forEach(d => {
    const nc = col + d.x;
    const nr = row + d.y;
    const dist = distSq(nc, nr, target.col, target.row);
    if (dist < bestDist) {
      bestDist = dist;
      best     = d;
    }
  });

  return best || ghost.dir;
}

function chooseDirRandom(ghost) {
  const validDirs = getValidDirs(ghost, false);
  if (!validDirs.length) return ghost.dir;
  return validDirs[Math.floor(Math.random() * validDirs.length)];
}


// Ghost house logic


// Ghost bounces up/down inside the house until released
function updateHouseGhost(ghost, delta) {
  const speed = GHOST_SPEED_HOUSE * (delta / 1000);

  ghost.y += ghost.houseMoveDir * speed;

  // Bounce between row 13 and row 15
  if (ghost.y >= 15) { ghost.y = 15; ghost.houseMoveDir = -1; }
  if (ghost.y <= 13) { ghost.y = 13; ghost.houseMoveDir =  1; }
}

// Move ghost upward out of the house door
function updateExitingGhost(ghost, delta) {
  const speed = GHOST_SPEED_NORMAL * (delta / 1000);
  const targetX = HOUSE_DOOR.col;
  const targetY = HOUSE_DOOR.row - 0.5; // just above door

  // First centre horizontally
  if (Math.abs(ghost.x - targetX) > 0.1) {
    ghost.x += Math.sign(targetX - ghost.x) * speed;
  } else {
    ghost.x = targetX;
    // Then move up
    if (ghost.y > targetY) {
      ghost.y -= speed;
    } else {
      // Done exiting
      ghost.y     = targetY;
      ghost.state = scatterChasePhase;
      ghost.dir   = { x: -1, y: 0 }; // exit moving left
    }
  }
}


// Eaten ghost — rush back to house


function updateEatenGhost(ghost, delta) {
  const speed = GHOST_SPEED_EATEN * (delta / 1000);
  const homeX = GHOST_STARTS[ghost.name].col;
  const homeY = GHOST_STARTS[ghost.name].row;

  // Move toward house door first, then into spawn position
  const target = ghost.y > HOUSE_DOOR.row
    ? { x: homeX, y: homeY }     // already inside
    : { x: HOUSE_DOOR.col, y: HOUSE_DOOR.row + 2 }; // go to door entrance

  const dx = target.x - ghost.x;
  const dy = target.y - ghost.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < speed) {
    ghost.x = target.x;
    ghost.y = target.y;
    if (ghost.y >= HOUSE_DOOR.row + 2) {
      // Back home — revive
      ghost.state       = 'house';
      ghost.houseMoveDir = 1;
      // Re-queue release after a short delay
      setTimeout(() => {
        if (ghost.state === 'house') ghost.state = 'exiting';
      }, 3000);
    }
  } else {
    ghost.x += (dx / dist) * speed;
    ghost.y += (dy / dist) * speed;
    ghost.dir = { x: Math.sign(dx), y: Math.sign(dy) };
  }
}

//  Main movement update


function updateGhostMovement(ghost, delta) {
  const speed = ghost.state === 'frightened' ? GHOST_SPEED_FRIGHTENED
              : ghost.state === 'eaten'       ? GHOST_SPEED_EATEN
              : GHOST_SPEED_NORMAL;

  // Only choose a new direction when at a tile centre
  if (atTileCentre(ghost.x) && atTileCentre(ghost.y)) {
    let newDir;

    if (ghost.state === 'frightened') {
      newDir = chooseDirRandom(ghost);

    } else if (ghost.state === 'scatter') {
      newDir = chooseDirToward(ghost, SCATTER_TARGETS[ghost.name]);

    } else if (ghost.state === 'chase') {
      const target      = getTargetTile(ghost);
      ghost.targetTile  = target;
      newDir            = chooseDirToward(ghost, target);

    } else {
      return; // house ghosts don't choose direction here
    }

    ghost.dir = newDir;
  }

  // Move
  const nextX = ghost.x + ghost.dir.x * speed * (delta / 1000);
  const nextY = ghost.y + ghost.dir.y * speed * (delta / 1000);
  const nextCol = Math.round(nextX);
  const nextRow = Math.round(nextY);

  if (canGhostMove(nextCol, nextRow, ghost)) {
    ghost.x = nextX;
    ghost.y = nextY;
  } else {
    // Hit a wall 
    ghost.x = Math.round(ghost.x);
    ghost.y = Math.round(ghost.y);
  }

  //  (same columns as Pac-Man, row 14)
  if (ghost.x < 0)             ghost.x = maze[0].length - 1;
  if (ghost.x >= maze[0].length) ghost.x = 0;
}


// Collision with Pac-Man


function checkGhostCollisions() {
  const px = player.x;
  const py = player.y;

  ghosts.forEach(ghost => {
    const dist = Math.sqrt(distSq(ghost.x, ghost.y, px, py));
    if (dist > 0.8) return; // not close enough

    if (ghost.state === 'frightened') {
      // Pac-Man eats the ghost
      const points = GHOST_EAT_BASE * Math.pow(2, ghostEatCombo);
      ghostEatCombo++;
      addScore(points);
      showEatScore(ghost.x, ghost.y, points);
      ghost.state = 'eaten';

    } else if (ghost.state === 'chase' || ghost.state === 'scatter') {
      // Ghost eats Pac-Man
      if (typeof loseLife === 'function') loseLife();
    }
  });
}

// Briefly show score popup where ghost was eaten
function showEatScore(tx, ty, points) {
  
  console.log(`Ate ghost! +${points}`);
 
}


// update function — call from game loop


function updateGhosts(delta) {
  ghosts.forEach(ghost => {

    // Handle release timer for house ghosts
    if (ghost.state === 'house' && !ghost.released) {
      ghost.releaseTimer -= delta;
      if (ghost.releaseTimer <= 0) {
        ghost.released = true;
        ghost.state    = 'exiting';
        return;
      }
      updateHouseGhost(ghost, delta);
      return;
    }

    if (ghost.state === 'house') {
      updateHouseGhost(ghost, delta);
      return;
    }

    if (ghost.state === 'exiting') {
      updateExitingGhost(ghost, delta);
      return;
    }

    if (ghost.state === 'eaten') {
      updateEatenGhost(ghost, delta);
      return;
    }

    // scatter / chase / frightened
    updateGhostMovement(ghost, delta);
  });

  checkGhostCollisions();
}


// Drawing


function drawGhosts() {
  ghosts.forEach(ghost => {
    if (ghost.state === 'eaten') {
      drawEyes(ghost);
      return;
    }
    drawGhostBody(ghost);
  });
}

function drawGhostBody(ghost) {
  const px = ghost.x * TILE_SIZE;
  const py = ghost.y * TILE_SIZE;
  const size = TILE_SIZE;
  const half = size / 2;

  ctx.save();

  let bodyColor;
  if (ghost.state === 'frightened') {
    // Flashing
    if (ghost.flashOn) {
      bodyColor = (Math.floor(Date.now() / 200) % 2 === 0) ? '#0000FF' : '#FFFFFF';
    } else {
      bodyColor = '#2121DE';
    }
  } else {
    bodyColor = ghost.color;
  }

  // Body 
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(px + half, py + half * 0.75, half, Math.PI, 0, false); // dome
  ctx.lineTo(px + size, py + size);

  // Wavy bottom (3 bumps)
  const bumps = 3;
  const bumpW = size / bumps;
  for (let i = bumps - 1; i >= 0; i--) {
    ctx.arc(
      px + bumpW * i + bumpW / 2,
      py + size,
      bumpW / 2,
      0, Math.PI, true
    );
  }
  ctx.lineTo(px, py + half * 0.75);
  ctx.closePath();
  ctx.fill();

  // Eyes
  if (ghost.state !== 'frightened') {
    // White of eye
    ctx.fillStyle = 'white';
    ctx.beginPath(); ctx.ellipse(px + half * 0.6, py + half * 0.7, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + half * 1.4, py + half * 0.7, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

    // Pupil — looks in movement direction
    const pupilOffX = ghost.dir.x * 1.5;
    const pupilOffY = ghost.dir.y * 1.5;
    ctx.fillStyle = '#3333FF';
    ctx.beginPath(); ctx.ellipse(px + half * 0.6 + pupilOffX, py + half * 0.7 + pupilOffY, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(px + half * 1.4 + pupilOffX, py + half * 0.7 + pupilOffY, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  } else {
    // Frightened face — X eyes and wavy mouth
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 1.5;
    // Left X eye
    ctx.beginPath(); ctx.moveTo(px+4, py+5); ctx.lineTo(px+7, py+8); ctx.moveTo(px+7, py+5); ctx.lineTo(px+4, py+8); ctx.stroke();
    // Right X eye
    ctx.beginPath(); ctx.moveTo(px+9, py+5); ctx.lineTo(px+12, py+8); ctx.moveTo(px+12, py+5); ctx.lineTo(px+9, py+8); ctx.stroke();
    // Wavy mouth
    ctx.beginPath(); ctx.moveTo(px+3, py+11); ctx.lineTo(px+5, py+9); ctx.lineTo(px+7, py+11); ctx.lineTo(px+9, py+9); ctx.lineTo(px+11, py+11); ctx.lineTo(px+13, py+9); ctx.stroke();
  }

  ctx.restore();
}

function drawEyes(ghost) {
  const px   = ghost.x * TILE_SIZE;
  const py   = ghost.y * TILE_SIZE;
  const half = TILE_SIZE / 2;

  ctx.save();

  // White of eye
  ctx.fillStyle = 'white';
  ctx.beginPath(); ctx.ellipse(px + half * 0.6, py + half * 0.7, 3, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px + half * 1.4, py + half * 0.7, 3, 4, 0, 0, Math.PI * 2); ctx.fill();

  // Pupil
  const pupilOffX = ghost.dir.x * 1.5;
  const pupilOffY = ghost.dir.y * 1.5;
  ctx.fillStyle = '#3333FF';
  ctx.beginPath(); ctx.ellipse(px + half * 0.6 + pupilOffX, py + half * 0.7 + pupilOffY, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(px + half * 1.4 + pupilOffX, py + half * 0.7 + pupilOffY, 2, 2.5, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}