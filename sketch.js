const log = console.log;


// constants
const CANVAS_SIZE = 400;
const BOARD_SIZE = 5; // number of cells in a row
const CELL_SIZE = CANVAS_SIZE / BOARD_SIZE;

// direction vectors to identify neighbor cells
const _LEFT = [-1, 0],
      _RIGHT = [1, 0],
      _TOP = [0, -1],
      _BOTTOM = [0, 1],
      _TOP_LEFT = [-1, -1],
      _TOP_RIGHT = [1, -1],
      _BOTTOM_LEFT = [-1, 1],
      _BOTTOM_RIGHT = [1, 1];

// game controls
let gameWon = false;
let solutionData = []; // array of rows
// a row is an array of booleans (true means this position is occupied, false means this position is empty)



function setup() {
  // create and put canvas in #canvas-container
  let canvasObj = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  canvasObj.parent("canvas-container");
  
  // assign onclick callback for New Game button
  select("button").elt.onclick = createNewGame;

  createNewGame();
}

// when program starts and when New Game button is clicked
function createNewGame(){
  // STEP 1: reset game controls data
  //////////////////////
  gameWon = false;
  
  
  // STEP 2: create solutionData
  // solutionData qualification: each cell must and only be surrounded by 1 to 4 surrounding cells
  // endless loop that stops when the created solutionData is qualified
  while(true){
    log("generating solutionData")
    solutionData = []; // firstly, empty the data
    // loop y: adding rows to solutionData
    for (let y=0; y < BOARD_SIZE; y++){
      let newRow = [];
      // loop x: adding booleans to newRow
      for (let x=0; x < BOARD_SIZE; x++){
        // adds a boolean that has 50% chance to be true
        newRow.push(random() < 0.5);
      }
      solutionData.push(newRow);
    }
    
    // solutionData is created, now check if it's qualified
    let isQualified = solutionData.every((row, yPos) => {
      // returns true if all cells in this row is qualified
      return row.every((isOccupied, xPos) => {
        const AMOUNT = getSurrCellsAmount([xPos, yPos], "all");
        // returns true if this cell has 1-5 surrounding cells  
        return AMOUNT >= 1 && AMOUNT <= 5;
      })
    });
    
    if (isQualified) break; // breaks the endless loop if qualified
  } // endless loop
  
  
  /////// test solutionData
  background(220);
  let xx = 0
  solutionData.forEach((row, y) => {
    row.forEach((isOccupied, x) => {
      if (isOccupied) fill("yellow")
      else fill("gray")
      square(x*CELL_SIZE, y*CELL_SIZE, CELL_SIZE);
      
      if (isOccupied) xx++
    })
  })
  log(100/25 * xx+"%")
}

function draw() {
  
}

function keyPressed(){
  if (gameWon) return; // exit if already won
  
  // if SPACE is pressed, mark occupied
  if (keyCode === 32){
    
  }
}



// takes in the position of the cell [x, y] and the group code (string), returns the amount of occupied cells in that group of surrounding cells
// targetGroup: all / adjacent / diagonal / left / right / top / bottom
function getSurrCellsAmount(cellPos, targetGroup){
  let targetVectors; // vectors of the target cells relative to cellPos
  if (targetGroup === "all"){
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM,
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (targetGroup === "adjacent"){
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM
    ];
  } else if (targetGroup === "diagonal"){
    targetVectors = [
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (targetGroup === "left"){
    targetVectors = [_LEFT, _TOP_LEFT, _BOTTOM_LEFT];
  } else if (targetGroup === "right"){
    targetVectors = [_RIGHT, _TOP_RIGHT, _BOTTOM_RIGHT];
  } else if (targetGroup === "top"){
    targetVectors = [_TOP, _TOP_LEFT, _TOP_RIGHT];
  } else if (targetGroup === "bottom"){
    targetVectors = [_BOTTOM, _BOTTOM_LEFT, _BOTTOM_RIGHT];
  }
  
  
  let occupiedCellsCount = 0;
  targetVectors.forEach(tVector => {
    // identify the exact position of this target cell
    const targetXPos = cellPos[0] + tVector[0];
    const targetYPos = cellPos[1] + tVector[1];
    
    // checks if this position is out of the board
    if (targetXPos < 0 || 
        targetXPos >= BOARD_SIZE || 
        targetYPos < 0 || 
        targetYPos >= BOARD_SIZE){
      return; // position doesn't exist, stop
    }
    
    // if this cell is occupied, plus 1 to totalCount
    if (solutionData[targetYPos][targetXPos]) {
      occupiedCellsCount++;
    }
  });
  
  return occupiedCellsCount;
}