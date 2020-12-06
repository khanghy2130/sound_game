/*
  -Figure out which gems are red and which are blue.
  -All gems are red by default, each must have a certain amount of blue gems surrounding and an unique rule depending on clue sounds.
  -Hover on the gem and press Z to switch color.
  -Or press X to play clue sounds.
  -Clue sounds tell which surrounding gems group, and how many blue gems should be in that group.
    
  -Assets:
    sounds: https://freesound.org
    gem images: https://opengameart.org/content/gem-jewel-diamond-glass
    checkmark image: https://commons.wikimedia.org/wiki/File:Check_green_circle.svg
    success image: https://pixabay.com/vectors/cup-icons-medal-win-game-2533629
    
  -Codes:
    flat(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flat
    every(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/every
    reduce(): https://www.tutorialrepublic.com/faq/how-to-find-the-sum-of-an-array-of-numbers-in-javascript.php
    for...in: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for...in
    desctructuring: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
    arrow function: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions
*/


// CONSTANTS
const MIN_BLUE_GEMS = 1;
const MAX_BLUE_GEMS = 4;
const BOARD_SIZE = 5; // number of cells in a row
const CANVAS_SIZE = 400;
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

// for amounts of 1 to 4, each amount has a list of combinations of numeric names (as numbers) ... the absolute value of their sum is equal to the corresponding amount
const AMOUNTS_COMBINATIONS = [
  [
    [1], [-1], [2, -1], [-1, 2], [1, -2], [-2, 1]
  ], // is 1
  [
    [1, 1], [-1, -1], [2], [-2]
  ], // is 2
  [
    [1, 2], [2, 1], [-1, -2], [-2, -1]
  ], // is 3
  [
    [2, 2], [-2, -2]
  ] // is 4
];

// GAME CONTROL VARIABLES
let isGenerating = false;
let gameWon = false;
let successImageYFactor = 0;
let hoveredPosition = null; // position [x,y] of the hovered gem, if is null then no gem is hovered. this is used when pressing Z to switch gem
let solutionData = []; // array of rows
// a row in solutionData is an array of booleans (true means this position is blue gem, false means this position is red gem)
let gemsData = []; // array of rows
// a row in gemsData is an array of gem objects...
/* 
a gem object has:
    groupName  >>  string of the group's name
    numericNames  >>  array of numeric names
    isBlue  >>  boolean for gameplay, by default is false (red gem)
    isSatisfied  >>  boolean for gameplay
    sizeFactor  >>  number that affects the gem size for gameplay
*/


// ASSET VARIABLES (images, sounds)
let bgImage, 
    blueGemImage, redGemImage, 
    checkmarkImage, successImage;
let successSound; // played when win

// groupSounds & numericSounds are dictionaries of "key": {fileName, volume, loadedSound}
const groupSounds = {
  "adjacent": {
    fileName: "bell.mp3",
    volume: 0.3,
    loadedSound: null
  },
  "diagonal": {
    fileName: "siren.mp3",
    volume: 0.2,
    loadedSound: null
  },
  "left": {
    fileName: "bees.mp3",
    volume: 0.3,
    loadedSound: null
  },
  "right": {
    fileName: "birds.mp3",
    volume: 0.4,
    loadedSound: null
  },
  "top": {
    fileName: "night.mp3",
    volume: 0.7,
    loadedSound: null
  },
  "bottom": {
    fileName: "wave.mp3",
    volume: 0.2,
    loadedSound: null
  }
};
const numericSounds = {
  // these numeric names are strings, but can be converted into number
  "-1": {
    fileName: "cat.wav",
    volume: 1,
    loadedSound: null
  },
  "-2": {
    fileName: "dog.wav",
    volume: 1,
    loadedSound: null
  },
  "1": {
    fileName: "frog.ogg",
    volume: 0.5,
    loadedSound: null
  },
  "2": {
    fileName: "monkey.ogg",
    volume: 0.1,
    loadedSound: null
  }
};


// CUSTOM FUNCTIONS (createNewGame, changeGemSize, renderAndUpdateGem, switchGem, playClueSound)

// when program starts and when New Game button is clicked
function createNewGame() {
  // CHECK: stop this function if already generating
  if (isGenerating) return;

  // STEP 1: reset game controls data
  isGenerating = true;
  gameWon = false;
  successImageYFactor = 0;
  hoveredPosition = null;
  solutionData = [];
  gemsData = [];

  // STEP 2: create solutionData
  // solutionData qualification: each gem must and only be surrounded by MIN_BLUE_GEMS to MAX_BLUE_GEMS blue gems
  // endless loop that stops when the created solutionData is qualified
  while (true) {
    // STEP 2.1: clear solutionData and populate it
    solutionData = []; // clear data
    // loop y: adding rows to solutionData
    for (let y = 0; y < BOARD_SIZE; y++) {
      let newRow = [];
      // loop x: adding booleans to newRow
      for (let x = 0; x < BOARD_SIZE; x++) {
        // adds a boolean that has 45% chance to be true
        // slightly under 50% so it's more likely less blue gems
        newRow.push(random() < 0.45);
      }
      solutionData.push(newRow);
    }

    // STEP 2.2: solutionData is created, now check if it's qualified
    let isQualified = solutionData.every((row, y) => {
      // returns true if all positions in this row is qualified
      return row.every((isBlue, x) => {
        const AMOUNT = getBlueGemsAmount([x, y], "all", true);
        // returns true if this position has proper amount of blue gems  
        return AMOUNT >= MIN_BLUE_GEMS && AMOUNT <= MAX_BLUE_GEMS;
      })
    });

    // STEP 2.3: if solutionData is qualified then break this endless loop, otherwise continue to loop back to STEP 2.1
    if (isQualified) break;
    else continue;
  }

  // STEP 3: set up gemsData
  // quickly set up a list of group names from groupSounds keys
  const allGroupNames = Object.keys(groupSounds);
  // use solutionData structure to create gemsData, only replace the booleans with gem objects
  gemsData = solutionData.map((row, y) => {
    // returning this new row of gem objects
    return row.map((isBlue, x) => {

      let pickedGroupName = null;
      let blueGemsAmount = null;
      // this loop stops when there is a valid pickedGroupName
      while (pickedGroupName === null) {
        // STEP 3.1: pick a random group name for this gem
        pickedGroupName = random(allGroupNames);

        // STEP 3.2: find the amount of blue gems in that group
        blueGemsAmount = getBlueGemsAmount([x, y], pickedGroupName, true);

        // STEP 3.2: check if this group doesn't have at least 1 blue gem, then set pickedGroupName to null to loop back to STEP 3.1
        if (blueGemsAmount < 1) pickedGroupName = null;
      }

      // STEP 3.4: pick a random combination of numberic names for the amount of blue gems
      // index is blueGemsAmount - 1 because the array starts at index 0
      const combinations = AMOUNTS_COMBINATIONS[blueGemsAmount - 1];
      const numericNames = random(combinations);
      return {
        groupName: pickedGroupName,
        numericNames: numericNames,
        isBlue: false,
        isSatisfied: false,
        sizeFactor: GEM_SIZE_FACTOR.SPAWN
      };
    });
  });

  isGenerating = false; // end of generation 
}

// enlarge or shrink the given gem
function changeGemSize(gemObject, isEnlarging) {
  if (isEnlarging) gemObject.sizeFactor += GEM_SIZE_FACTOR.SPEED;
  else gemObject.sizeFactor -= GEM_SIZE_FACTOR.SPEED;
}
// render and update an individual gem
function renderAndUpdateGem(gemObject, x, y) {
  const renderX = CELL_SIZE * (x + 0.5);
  const renderY = CELL_SIZE * (y + 0.5);
  const renderGemSize = CELL_SIZE * gemObject.sizeFactor / 100;
  // assign to gemImage blue or red gem based on isBlue property
  let gemImage = gemObject.isBlue ? blueGemImage : redGemImage;
  image(
    gemImage, renderX, renderY,
    renderGemSize, renderGemSize
  );
  // render the check mark if isSatisfied property is true
  if (gemObject.isSatisfied) {
    const checkmarkSize = CELL_SIZE * 0.4;
    const offsetAmount = CELL_SIZE * 0.25;
    image(
      checkmarkImage,
      renderX + offsetAmount, renderY - offsetAmount,
      checkmarkSize, checkmarkSize
    );
  }

  // check if not won yet and mouse is hovered on this gem
  const distanceFromGem = dist(mouseX, mouseY, renderX, renderY);
  if (!gameWon && distanceFromGem < CELL_SIZE * GEM_SIZE_FACTOR.HOVERED / 200) {
    // only shrink the gem if still bigger than HOVERED size
    if (gemObject.sizeFactor > GEM_SIZE_FACTOR.HOVERED) {
      changeGemSize(gemObject, false);
    }
    // if is smaller than HOVERED size then enlarge
    else if (gemObject.sizeFactor < GEM_SIZE_FACTOR.HOVERED) {
      changeGemSize(gemObject, true);
    }
    cursor(HAND); // change cursor image
    hoveredPosition = [x, y];
  }
  // otherwise, enlarge the gem (if still smaller than NORMAL size)
  else if (gemObject.sizeFactor < GEM_SIZE_FACTOR.NORMAL) {
    changeGemSize(gemObject, true);
  }
}

// called when Z is pressed and is hovering on a gem
function switchGem(hoveredGemObject) {
  // STEP 1: switch gem
  hoveredGemObject.isBlue = !hoveredGemObject.isBlue;
  // STEP 2: reset size so it will play the enlarging animation
  hoveredGemObject.sizeFactor = GEM_SIZE_FACTOR.SPAWN;

  // STEP 3: check if all gems are satisfied
  gemsData.forEach((row, y) => {
    row.forEach((gemObject, x) => {
      // STEP 3.1: get the amount of blue gems around this gem ("all" and target group name)
      const allBlueGemsAmount = getBlueGemsAmount(
        [x, y], "all", false
      );
      const targetBlueGemsAmount = getBlueGemsAmount(
        [x, y], gemObject.groupName, false
      );

      // STEP 3.2: evaluate the 2 rules
      // first rule is "all" should has MIN_BLUE_GEMS to MAX_BLUE_GEMS gems only
      const rule1 = allBlueGemsAmount >= MIN_BLUE_GEMS && allBlueGemsAmount <= MAX_BLUE_GEMS;
      // second rule is the amount from target group name must be equal to the absolute value of the sum of the numeric names (which are numbers)
      const numericNamesSum = gemObject.numericNames.reduce(function(a, b) {
        return a + b;
      }, 0);
      const rule2 = abs(numericNamesSum) === targetBlueGemsAmount;

      // STEP 3.3: check if both rules are true then this gem is satisfied
      gemObject.isSatisfied = rule1 && rule2;
    });
  });
  
  // STEP 4: set gameWon to true if all gems are satisfied
  // flatten gemsData so it becomes 1 dimensional array then use every() to check isSatisfied of each gemObj
  const allGemsSatisfied = gemsData.flat().every(
    gemObj => gemObj.isSatisfied
  );
  if (allGemsSatisfied){
    gameWon = true;
    successSound.play();
  }
}

// called when X is pressed
function playClueSound(hoveredGemObject){
  // STEP 1: play a sound from group name
  groupSounds[hoveredGemObject.groupName].loadedSound.play();
  
  // STEP 2: set timeouts to play the sounds from numeric names
  hoveredGemObject.numericNames.forEach((numericName, index) => {
    // converts numbericName from number to string
    const stringifiedName = numericName.toString();
    // plays the sound after a delay (0.3sec + index * 1sec)
    setTimeout(() => {
      numericSounds[stringifiedName].loadedSound.play();
    }, 300 + index * 1000);
  });
}


// takes in the position [x,y], the group name (string), and whether to check solution or the gameplay data (boolean). returns the amount of blue gems in that group
// groupName: all / adjacent / diagonal / left / right / top / bottom
function getBlueGemsAmount(position, groupName, checkSolution) {
  // STEP 1: Assign targetVectors corresponding to groupName
  let targetVectors;
  if (groupName === "all") {
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM,
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (groupName === "adjacent") {
    targetVectors = [
      _LEFT, _RIGHT, _TOP, _BOTTOM
    ];
  } else if (groupName === "diagonal") {
    targetVectors = [
      _TOP_LEFT, _TOP_RIGHT, _BOTTOM_LEFT, _BOTTOM_RIGHT
    ];
  } else if (groupName === "left") {
    targetVectors = [_LEFT, _TOP_LEFT, _BOTTOM_LEFT];
  } else if (groupName === "right") {
    targetVectors = [_RIGHT, _TOP_RIGHT, _BOTTOM_RIGHT];
  } else if (groupName === "top") {
    targetVectors = [_TOP, _TOP_LEFT, _TOP_RIGHT];
  } else if (groupName === "bottom") {
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

    // check if this is blue gem then plus 1 to counter
    // checkSolution is true then check from solutionData
    if (checkSolution) {
      if (solutionData[targetYPos][targetXPos]) blueGemsCount++;
    }
    // checkSolution is false then check from gemsData
    else {
      if (gemsData[targetYPos][targetXPos].isBlue) blueGemsCount++;
    }
  });

  return blueGemsCount;
}




// P5JS EVENT FUNCTIONS (preload, setup, draw, keyPressed)

function preload() {
  // load images
  bgImage = loadImage("assets/background.jpg");
  blueGemImage = loadImage("assets/blue_gem.png");
  redGemImage = loadImage("assets/red_gem.png");
  checkmarkImage = loadImage("assets/checkmark.png");
  successImage = loadImage("assets/success.png");
  
  // load sounds and then set their volumes
  successSound = loadSound("assets/success.mp3", () => {
    successSound.setVolume(0.1); // win sound volume
  });
    
  // looping through values of numericSounds
  for (const key in numericSounds) {
    const valueObject = numericSounds[key];
    valueObject.loadedSound = loadSound(
      "numeric_sounds/" + valueObject.fileName, 
      () => {
        valueObject.loadedSound.setVolume(valueObject.volume);
      }
    );
  }

  // looping through values of groupSounds
  for (const key in groupSounds) {
    const valueObject = groupSounds[key];
    valueObject.loadedSound = loadSound(
      "group_sounds/" + valueObject.fileName, 
      () => {
        valueObject.loadedSound.setVolume(valueObject.volume);
      }
    );
  }
}

function setup() {
  // create and put canvas in #canvas-container
  let canvasObj = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
  canvasObj.parent("canvas-container");

  // grab New Game button to assign onclick callback
  select("#new-game-button").elt.onclick = createNewGame;

  // program settings
  frameRate(30);
  imageMode(CENTER); // CENTER is a constant pre-defined by p5js
  
  createNewGame(); // initiate the generation
}

function draw() {
  // reset from last frame
  cursor(ARROW);
  hoveredPosition = null;

  // render background image that cover the entire canvas
  image(bgImage, width / 2, height / 2, width, height);

  // render and update all the gems
  gemsData.forEach((row, y) => {
    row.forEach((gemObject, x) => {
      renderAndUpdateGem(gemObject, x, y);
    })
  });
  
  // render success image if game won
  if (gameWon){
    // update successImageYFactor: falls down from the top to the center of the canvas (goes from 0 to 0.5)
    if (successImageYFactor < 0.5) successImageYFactor += 0.03;
    
    const imgSize = CANVAS_SIZE * 0.4;
    image(
      successImage, 
      width/2, height * successImageYFactor,
      imgSize, imgSize
    );
  }
}

function keyPressed() {
  // exit if already won or no gem is hovered
  if (gameWon || hoveredPosition === null) return;
  
  // since there is a gem being hovered, grab it
  const [x,y] = hoveredPosition;
  const hoveredGemObject = gemsData[y][x];

  // if Z is pressed then call switchGem()
  if (keyCode === 90) switchGem(hoveredGemObject);
  // if X is pressed then call playClueSound()
  else if (keyCode === 88) playClueSound(hoveredGemObject);
}
