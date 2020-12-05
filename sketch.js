/*
    Figure out which gems are green and which are blue.
    All gems are green by default. 
    Hover on the gem and press SPACE to toggle color.
    Or mouse-click the gem to play clue sounds.
    Clue sounds tell which surrounding gems group, and how many blue gems should be in that group.
    
    Credits: 
      gem images (https://opengameart.org/content/gem-jewel-diamond-glass)
*/

const log = console.log; // short alias

// constants
const CANVAS_SIZE = 400;
const BOARD_SIZE = 5; // number of cells in a row
const CELL_SIZE = CANVAS_SIZE / BOARD_SIZE;
const GEM_SIZE_FACTOR = {
  "SPAWN": 40,
  "HOVERED": 70,
  "NORMAL": 80,
  "SPEED": 5 // speed to change size
};

// directional vectors to identify neighbor positions
const _LEFT = [-1, 0],
      _RIGHT = [1, 0],
      _TOP = [0, -1],
      _BOTTOM = [0, 1],
      _TOP_LEFT = [-1, -1],
      _TOP_RIGHT = [1, -1],
      _BOTTOM_LEFT = [-1, 1],
      _BOTTOM_RIGHT = [1, 1];

// group & numeric sounds info are dictionaries of "key": [sound name, volume]
const GROUP_SOUNDS_INFO = {
  "adjacent": ["", 1], 
  "diagonal": ["", 1], 
  "left": ["", 1], 
  "right": ["", 1], 
  "top": ["", 1], 
  "bottom": ["", 1]
};
const NUMERIC_SOUNDS_INFO = {
  // these numeric names are strings, but can be converted into number
  "-1": ["", 1],
  "-2": ["", 1], 
  "1": ["", 1], 
  "2": ["", 1]
};
/////log(Object.keys(NUMERIC_SOUNDS_INFO).map(k => Number(k)))

// for amounts of 1 to 4, each amount has a list of combinations of numeric names (as numbers) ... the absolute value of their sum is equal to the corresponding amount
const AMOUNTS_COMBINATIONS = [
  [ [1], [-1], [2,-1], [-1,2], [1,-2], [-2,1] ], // is 1
  [ [1,1], [-1,-1], [2], [-2] ], // is 2
  [ [1,2], [2,1], [-1,-2], [-2,-1] ], // is 3
  [ [2,2], [-2,-2] ] // is 4
];

// game control variables
let isGenerating = false;
let gameWon = false;
let solutionData = []; // array of rows
// a row in solutionData is an array of booleans (true means this position is blue gem, false means this position is green gem)
let gemsData = []; // array of rows
// a row in gemsData is an array of gem objects...
/* 
a gem object has:
    groupName  >>  string of the group's name
    numbericNames  >>  array of numeric names
    isBlue  >>  boolean for gameplay, by default is false (green gem)
    isSatisfied  >>  boolean for gameplay
    sizeFactor  >>  number that affects the gem size for gameplay
*/
let hoveredPosition = null; // position [x,y] of the hovered gem, if is null then no gem is hovered. this is used when pressing Z to switch gem


// asset variables (images, sounds)
let bgImage, blueGemImage, greenGemImage;
// soundsContainer has 2 sub-containers which contain the loaded sound files
let soundsContainer = { group: {}, numberic: {} };



function preload(){
  // load images
  bgImage = loadImage("assets/background.jpg");
  blueGemImage = loadImage("assets/blue_gem.png");
  greenGemImage = loadImage("assets/green_gem.png");
}

function setup() {
  // create and put canvas in #canvas-container
  let canvasObj = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  canvasObj.parent("canvas-container");
  
  // grab New Game button to assign onclick callback
  select("button").elt.onclick = createNewGame;

  // program settings
  frameRate(30);
  imageMode(CENTER); // CENTER is a constant pre-defined by p5js
  textAlign(CENTER, CENTER);
  
  createNewGame(); // initiate the generation
}

// when program starts and when New Game button is clicked
function createNewGame(){
  // CHECK: stop this function if already generating
  if (isGenerating) return;
  
  // STEP 1: reset game controls data
  isGenerating = true;
  gameWon = false;
  solutionData = [];
  gemsData = [];
  
  
  // STEP 2: create solutionData
  // solutionData qualification: each gem must and only be surrounded by 1 to 4 blue gems
  // endless loop that stops when the created solutionData is qualified
  while(true){
    log("generating solutionData")
    // STEP 2.1: clear solutionData and populate it
    solutionData = []; // clear data
    // loop y: adding rows to solutionData
    for (let y=0; y < BOARD_SIZE; y++){
      let newRow = [];
      // loop x: adding booleans to newRow
      for (let x=0; x < BOARD_SIZE; x++){
        // adds a boolean that has 45% chance to be true
        // slightly under 50% so it's more likely less blue gems
        newRow.push(random() < 0.45);
      }
      solutionData.push(newRow);
    }
    
    // STEP 2.2: solutionData is created, now check if it's qualified
    let isQualified = solutionData.every((row, yPos) => {
      // returns true if all positions in this row is qualified
      return row.every((isOccupied, xPos) => {
        const AMOUNT = getBlueGemsAmount([xPos, yPos], "all");
        // returns true if this position has 1-4 surrounding blue gems  
        return AMOUNT >= 1 && AMOUNT <= 4;
      })
    });
    
    // STEP 2.3: if solutionData is qualified then break this endless loop, otherwise continue to loop back to STEP 2.1
    if (isQualified) break;
    else continue;
  }
  
  // STEP 3: set up gemsData
  // quickly set up a list of group names from GROUP_SOUNDS_INFO keys
  const allGroupNames = Object.keys(GROUP_SOUNDS_INFO);
  // use solutionData structure to create gemsData, only replace the booleans with gem objects
  gemsData = solutionData.map((row, y) => {
    // returning this new row of gem objects
    return row.map((unusedBoolean, x) => {

      let pickedGroupName = null;
      let blueGemsAmount = null;
      // this loop stops when there is a valid pickedGroupName
      while (pickedGroupName === null){
        // STEP 3.1: pick a random group name for this gem
        pickedGroupName = random(allGroupNames);
        
        // STEP 3.2: find the amount of blue gems in that group
        blueGemsAmount = getBlueGemsAmount([x,y], pickedGroupName);
        
        // STEP 3.2: check if this group doesn't have at least 1 blue gem, then set pickedGroupName to null to loop back to STEP 3.1
        if (blueGemsAmount < 1) pickedGroupName = null;
      }
      
      // STEP 3.4: pick a random combination of numberic names for the amount of blue gems
      // index is blueGemsAmount - 1 because the array starts at index 0
      const combinations = AMOUNTS_COMBINATIONS[blueGemsAmount - 1];
      const numbericNames = random(combinations);
      return {
        groupName: pickedGroupName,
        numbericNames: numbericNames,
        isBlue: false,
        isSatisfied: false,
        sizeFactor: GEM_SIZE_FACTOR.SPAWN
      };
    });
  });
  
  log(gemsData)
  
  isGenerating = false; // end of generation 
}

// enlarge or shrink the given gem
function changeGemSize(gemObject, isEnlarging){
  if (isEnlarging) gemObject.sizeFactor += GEM_SIZE_FACTOR.SPEED;
  else gemObject.sizeFactor -= GEM_SIZE_FACTOR.SPEED;
}
// render and update an individual gem
function renderAndUpdateGem(gemObject, x, y){
  const renderX = CELL_SIZE * (x + 0.5);
  const renderY = CELL_SIZE * (y + 0.5);
  const renderGemSize = CELL_SIZE * gemObject.sizeFactor/100;
  // assign to renderImage blue or green gem
  let renderImage = gemObject.isBlue ? blueGemImage : greenGemImage;
  image(
    renderImage, renderX, renderY,
    renderGemSize, renderGemSize
  );
  
  // check if not won yet and mouse is hovered on this gem
  const distanceFromGem = dist(mouseX, mouseY, renderX, renderY);
  if (!gameWon && distanceFromGem < CELL_SIZE * GEM_SIZE_FACTOR.HOVERED/200){
    // only shrink the gem if still bigger than HOVERED size
    if (gemObject.sizeFactor > GEM_SIZE_FACTOR.HOVERED) {
      changeGemSize(gemObject, false);
    } 
    // if is smaller than HOVERED size then enlarge
    else if (gemObject.sizeFactor < GEM_SIZE_FACTOR.HOVERED) {
      changeGemSize(gemObject, true);
    }
    cursor(HAND); // change cursor image
    hoveredPosition = [x,y];
  }
  // otherwise, enlarge the gem (if still smaller than NORMAL size)
  else if (gemObject.sizeFactor < GEM_SIZE_FACTOR.NORMAL) {
    changeGemSize(gemObject, true);
  }
} 

function draw() {
  // reset from last frame
  cursor(ARROW);
  hoveredPosition = null;
  
  
  // render background image that cover the entire canvas
  image(bgImage, width/2, height/2, width, height);
  
  // render and update all the gems
  gemsData.forEach((row, y) => {
    row.forEach((gemObject, x) => {
      renderAndUpdateGem(gemObject, x, y);
    })
  });
  
}

function keyPressed(){
  if (gameWon) return; // exit if already won
  
  // if Z is pressed and there mouse is hovered on a gem
  if (keyCode === 90 && hoveredPosition !== null){
    // switch gem
    let [x, y] = hoveredPosition;
    gemsData[y][x].isBlue = !gemsData[y][x].isBlue;
    // set small size
    gemsData[y][x].sizeFactor = GEM_SIZE_FACTOR.SPAWN;
  }
}



// takes in the position [x,y] and the group name (string), returns the amount of blue gems in that group
// groupName: all / adjacent / diagonal / left / right / top / bottom
function getBlueGemsAmount(position, groupName){
  // STEP 1: Assign targetVectors corresponding to groupName
  let targetVectors;
  if (groupName === "all"){
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM,
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (groupName === "adjacent"){
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM
    ];
  } else if (groupName === "diagonal"){
    targetVectors = [
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (groupName === "left"){
    targetVectors = [_LEFT, _TOP_LEFT, _BOTTOM_LEFT];
  } else if (groupName === "right"){
    targetVectors = [_RIGHT, _TOP_RIGHT, _BOTTOM_RIGHT];
  } else if (groupName === "top"){
    targetVectors = [_TOP, _TOP_LEFT, _TOP_RIGHT];
  } else if (groupName === "bottom"){
    targetVectors = [_BOTTOM, _BOTTOM_LEFT, _BOTTOM_RIGHT];
  }
  
  // STEP 2: Count how many targeted cells that are blue gems
  let blueGemsCount = 0;
  targetVectors.forEach(tVector => {
    // identify the exact position of this target cell
    const targetXPos = position[0] + tVector[0];
    const targetYPos = position[1] + tVector[1];
    
    // checks if this position is out of the board
    const xIsOut = targetXPos < 0 || targetXPos >= BOARD_SIZE;
    const yIsOut = targetYPos < 0 || targetYPos >= BOARD_SIZE;
    if (xIsOut || yIsOut) return; // if position doesn't exist, stop
    
    // if this is blue gem, plus 1 to counter
    if (solutionData[targetYPos][targetXPos]) blueGemsCount++;
  });
  
  return blueGemsCount;
}
