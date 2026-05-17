// Canvas
const canvas = document.getElementById('gameCanvas');
const ctx= canvas.getContext('2d');

const TILE_SIZE = 16; // pixels per tile

// Tile type constants ( connected to json)
const TILE = {
  EMPTY : 0,
  WALL: 1,
  PELLET: 2,
  POWER : 3
};
// load from maze.json
// mazeTemplate is the set copy from the server (no changes)
// maze is the (( live )) copy modified 
let mazeTemplate = [];
let maze= [];

function loadMaze() {
  return $.get('Maze.json') //load maze from json file using .get
    .done(function (data) {
      mazeTemplate = data;
    })
    .fail(function (jqXHR, textStatus, errorThrown) {//error throw
      console.error('Failed to load Maze.json:', textStatus, errorThrown);
    });
}

//copy mazeTemplate into the live maze array
// Call at game start and after every level-up
 
function resetMaze() {
  maze= mazeTemplate.map(row => [...row]);
}


//  draw the maze (based on maze array status)
function drawMaze() {
  maze.forEach((row, r) => {
    row.forEach((tile, c) => {
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;

      switch (tile) {
        case TILE.WALL:
          ctx.fillStyle ='#3a3aff';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#5555ff';
          ctx.fillRect(x + 1, y + 1, TILE_SIZE -2, 2);
          ctx.fillRect(x + 1, y + 1, 2, TILE_SIZE - 2);
          break;

        case TILE.PELLET:
          ctx.fillStyle ='#ffdfbe';
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE / 2, y +TILE_SIZE / 2, 2, 0, Math.PI *2);
          ctx.fill();
          break;

        case TILE.POWER:
          const pulse = 0.7 + 0.3 *Math.sin(Date.now()/ 200);
          ctx.fillStyle = `rgba(255, 223,190, ${pulse})`;
          ctx.beginPath();
          ctx.arc(x + TILE_SIZE /2, y + TILE_SIZE / 2,5,0, Math.PI * 2);
          ctx.fill();
          break;

      }
    });
  });
}

// Player

//position in tile units 
//dir = direction currently 
//nextDir = direction from keypress

const player = {
  x: 13.5, //centre of the maze
  y: 22,
  dir: { x: 0, y: 0 },
  nextDir: { x: 0, y: 0 },
  speed: 5, //tiles per second
  radius:(TILE_SIZE / 2) -1,

// Mouth open & close animation 
  mouthAngle: 0.25,             
  mouthDir : -1,               // -1 closing, +1 opening

//Rotate so mouth always faces the movement direction
  get rotation() {
    if (this.dir.x === 1) return 0;
    if (this.dir.x=== -1) return Math.PI;
    if (this.dir.y === -1) return -Math.PI / 2;
    if (this.dir.y===  1) return Math.PI/ 2;
    return 0;
  }
};

// Keyboard input
const KEY_MAP = {
  ArrowLeft : { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  ArrowUp : { x: 0, y: -1 },
  ArrowDown : { x: 0, y: 1 },
  a: { x: -1, y: 0 },
  d: { x: 1, y:0 },
  w : { x: 0, y: -1 },
  s : { x: 0, y: 1 },
};


$(document).on('keydown', function (e) {
  if (KEY_MAP[e.key]) {
    player.nextDir = KEY_MAP[e.key];
    e.preventDefault(); //stop arrow from scrolling the page
  }
  if (e.key === 'p'|| e.key === 'P'|| e.key === 'Escape') {// if p or esc == pause toggle
    togglePause();
  }
});

// Wall collision 
// Returns true if  moving dir won't hit a wall
 
function canMove(x, y, dir) {
  const nextCol = Math.floor(x + dir.x * 0.75+ 0.5);
  const nextRow = Math.floor(y + dir.y * 0.75 + 0.5);

  if (nextCol < 0|| nextCol >= 28) return true;  //tunnel exit — allow 
  if (nextRow < 0 || nextRow >= 31) return false;

  return maze[nextRow][nextCol] !== TILE.WALL;
}

// Scoring & eating pellet

const SCORES = { PELLET: 10, POWER: 50, GHOST_BASE: 200 };
let score = 0;
let ghostCombo = 0; //doubles per ghost eaten in frightened 

function eatPellet() {
  const col = Math.round(player.x);
  const row = Math.round(player.y);

  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return;

  if (maze[row][col] === TILE.PELLET) {
    maze[row][col] = TILE.EMPTY;
    addScore(SCORES.PELLET);
    checkLevelUp(maze, TILE);   //level.js
  } else if (maze[row][col]=== TILE.POWER) {
    maze[row][col] = TILE.EMPTY;
    addScore(SCORES.POWER);
    ghostCombo = 0;
    checkLevelUp(maze,TILE);   //level.js
  }
}

function addScore(points) {
  score += points;
  document.getElementById('score').textContent =score;
}

// level.js call after incrementing currentLevel for new speed
function resetMazeForNextLevel() {
  levelCleared = false; //flag lives in level.js 
  resetMaze();

  player.x = 13.5;
  player.y= 22;
  player.dir= { x: 0, y: 0 };
  player.nextDir = { x: 0, y: 0 };

  showReady();
}

// Player update 

function updatePlayer(delta) {
  const dt =delta /1000; // ms to seconds

  // new direction if the path  clear
  if (canMove(player.x, player.y, player.nextDir)) {
    player.dir = { ...player.nextDir };
  }

  // Move in the direction if not blocked
  if (canMove(player.x, player.y, player.dir)) {
    player.x += player.dir.x * player.speed * dt;
    player.y += player.dir.y * player.speed * dt;
  }

  // Tunnel wrap-around 
  if (player.x < 0)  player.x = 27;
  if (player.x > 27) player.x = 0;

  eatPellet();

  //Animate mouth
  player.mouthAngle += player.mouthDir * 0.05;
  if (player.mouthAngle >= 0.25) player.mouthDir = -1;
  if (player.mouthAngle <= 0) player.mouthDir =  1;
}

//Draw Pac-Man

function drawPlayer() {
  const px = player.x *TILE_SIZE + TILE_SIZE / 2;
  const py = player.y *TILE_SIZE + TILE_SIZE / 2;
  const openAngle = player.mouthAngle * Math.PI;

  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(player.rotation);

  ctx.fillStyle = '#FFE000';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.arc(0, 0, player.radius, openAngle, Math.PI * 2 - openAngle);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Game state

let lives = 3;
let paused = false;
let gameOver = false;
//currentLevel and levelCleared in level.js

document.getElementById('pause-btn').addEventListener('click', togglePause);
function togglePause() {
  paused = !paused;
  document.getElementById('pause-btn').textContent = paused ? 'Resume': 'Pause';
}

function showReady() {
  $('#ready-msg').removeClass('hidden');
  setTimeout(() => $('#ready-msg').addClass('hidden'), 2000); 
}

function loseLife() {
  lives--;
  $('#lives').text(lives);
  if (lives <= 0) {
    triggerGameOver();
    return;
  }

  // Reset only Pac-Man w/o resetting the maze or score
  player.x = 13.5;
  player.y = 22;
  player.dir= { x: 0, y: 0 };
  player.nextDir = { x: 0, y: 0 };
  respawnGhosts();
  showReady();
}

function triggerGameOver() {
  gameOver = true;
  sessionStorage.setItem('finalScore', score);
  sessionStorage.setItem('playerName', sessionStorage.getItem('playerName') || 'Player');
  setTimeout(() => { window.location.href ='gameover.html'; }, 1500);
}

//Game loop
let lastTime = 0;

function gameLoop(timestamp) {
  const delta = timestamp - lastTime;
  lastTime= timestamp;

  if (!paused && !gameOver) {
    //Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawMaze();
    updatePlayer(delta);
    updateGhosts(delta);
    drawPlayer();
    drawGhosts();

  }

  requestAnimationFrame(gameLoop);
}


// init called at top so we can wait loadMaze()
$(document).ready(function () {

  // send nameless visitors to the start screen
  const storedName = sessionStorage.getItem('playerName');
  if (!storedName) {
    window.location.href = 'index.html';
    return;
  }

  // Load maze data from Maze.json using jQuery $.get()
  $.get('Maze.json')
    .done(function (data) {
      mazeTemplate = data;

      // HUD
      $('#level').text(currentLevel); // from level.js
      $('#lives').text(lives);

      // level-1 speeds from level.js
      applyLevelSpeed();

      // Fill the live maze and show "Ready!"
      resetMaze();
      initGhosts();
      showReady();

      // pause so player sees "Ready!" before the loop starts
      setTimeout(function () {
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
      }, 2000);
    })
    .fail(function (jqXHR, textStatus, errorThrown) {
      console.error('Failed to load Maze.json:', textStatus, errorThrown);
    });

});