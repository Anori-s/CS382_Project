
// LEVEL PROGRESSION – to be merged into game.js
let currentLevel = 1;
let levelCleared = false;

// Speed: +0.5 for pac‑man, +0.4 for ghosts each level
function applyLevelSpeed() {
  if (typeof player !== 'undefined') {
    player.speed = 4.0 + (currentLevel - 1) * 0.5;
  }
  if (typeof GHOST_SPEED_NORMAL !== 'undefined') {
    GHOST_SPEED_NORMAL = 3.5 + (currentLevel - 1) * 0.4;
  }
}

// Call this after every pellet is eaten
function checkLevelUp(maze, TILE) {
  let allEaten = true;
  for (let row = 0; row < maze.length; row++) {
    for (let col = 0; col < maze[0].length; col++) {
      if (maze[row][col] === TILE.PELLET || maze[row][col] === TILE.POWER) {
        allEaten = false;
        break;
      }
    }
  }
  if (allEaten && !levelCleared) {
    levelCleared = true;
    currentLevel++;
    applyLevelSpeed();
    // tell the core game to reset the maze (keep score & lives)
    if (typeof resetMazeForNextLevel === 'function') resetMazeForNextLevel();
    // update on‑screen level display
    const levelElem = document.getElementById('level');
    if (levelElem) levelElem.innerText = currentLevel;
  }
}