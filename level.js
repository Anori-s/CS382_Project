
let currentLevel = 1; 
let levelCleared = false; // prevents multiple level‑ups from a single pellet

// responsible to speed up each new level.
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
  let allEaten = true; //Assume the maze is empty of pellets.
  for (let row = 0; row < maze.length; row++) {
    for (let col = 0; col < maze[0].length; col++) {
      if (maze[row][col] === TILE.PELLET || maze[row][col] === TILE.POWER) {// if we found one pellet no need to check the rest we know it is not empty.
        allEaten = false;
        break;// loop thru each cell in the mazw if we found a pellet , set the allEaten=false and stop. 
      }
    }
  }
  if (allEaten && !levelCleared) {// if all pellets are eaten and we haven't already cleared the level, then level up
    levelCleared = true;
    currentLevel++;
    applyLevelSpeed();
  // Reset the maze and player position for the next level from game.js 
    if (typeof resetMazeForNextLevel === 'function') resetMazeForNextLevel();// Checks if the main game (game.js) has provided a callback function to reset the maze
    // update on‑screen level display
    const levelElem = document.getElementById('level');//Finds the HTML element that displays the level number and updates it to the current level.
    if (levelElem) levelElem.innerText = currentLevel;
  }
}