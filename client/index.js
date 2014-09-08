(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var ComponentEngine = require('component-engine').Engine;

var engine;

document.addEventListener("DOMContentLoaded", function() {
    engine = new ComponentEngine({
        clearColor: 0x000000
    });
    engine.camera.position.z = 500;

    createGame();

    // TODO: temporary controls
    var controls = new THREE.OrbitControls(engine.camera);
    engine.on('update', function() {
        controls.update();
    });

    engine.run();
});

var Entity = require('component-engine').Entity;

function createGame() {
    var GameComponent = require('./lib/game_component');

    var entity = new Entity(engine);
    entity.addComponent(new GameComponent(entity));

    return entity;
}

},{"./lib/game_component":3,"component-engine":5}],2:[function(require,module,exports){
'use strict';

var util = require('./util'),
    assert = require('assert');

var AiStrategy = {
    RandomOpenCell: 0,
    Minimax: 1,
    AlphaBetaPruning: 2
}

// The strategy to use for the AI turn.
var ACTIVE_AI_STRATEGY = AiStrategy.AlphaBetaPruning;//AiStrategy.Minimax;

/**
 * Maximum # of plies (depth) for the minimax/alpha-beta tree.
 * -1 means that the entire tree will be generated.
 */
var MAX_PLY_COUNT = -1;

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Dumb AI to randomly select an open space on the board.
 */
function doRandomOpenCell(boardInfo) {
    var openCells = [];
    for (var y = 0; y < boardInfo.rowCount; y++) {
        for (var x = 0; x < boardInfo.colCount; x++) {
            if (util.canPlaceMarker(x, y, boardInfo.cells)) {
                openCells.push({ x: x, y: y });
            }
        }
    }

    var idx = getRandomInt(0, openCells.length);
    return openCells[idx];
}

var Operation = {
    Min: 0,
    Max: 1
};

function doMinimax(boardInfo, myMarker) {
    return doMinimaxImpl(boardInfo, myMarker, Operation.Max, MAX_PLY_COUNT).cell;
}

function doMinimaxImpl(boardInfo, myMarker, operation, depth) {
    // Generate list of all possible moves for the next state.
    var moveList = generateMoves(boardInfo);

    // No possible moves (leaf node).
    if (moveList.length === 0 ||
        depth === 0) {
        return {
            score: evaluateScore(boardInfo, myMarker)
        };
    }

    var bestScore = (operation === Operation.Min) ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
    var bestCell = null;

    // For all the possible moves, recursively evaluate the next move - expand the tree.
    for (var i = 0; i < moveList.length; i++) {
        var cell = moveList[i];
        var score;

        if (operation === Operation.Max) {
            // Change the board state.
            boardInfo.cells[cell.x][cell.y] = myMarker;

            // Evaluate.
            score = doMinimaxImpl(boardInfo, myMarker, Operation.Min, depth - 1).score;

            // Maximize.
            if (score > bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        } else {
            // Change the board state.
            boardInfo.cells[cell.x][cell.y] = util.getOppositeMarker(myMarker);

            // Evaluate.
            score = doMinimaxImpl(boardInfo, myMarker, Operation.Max, depth - 1).score;

            // Minimize.
            if (score < bestScore) {
                bestScore = score;
                bestCell = cell;
            }
        }

        // Undo board state change.
        boardInfo.cells[cell.x][cell.y] = null;
    }

    assert(bestCell !== null);
    return {
        score: bestScore,
        cell: bestCell
    };
}

function doAlphaBetaPruning(boardInfo, myMarker) {
    return doAlphaBetaPruningImpl(boardInfo, myMarker, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY, Operation.Max, MAX_PLY_COUNT).cell;
}

function doAlphaBetaPruningImpl(boardInfo, myMarker, alpha, beta, operation, depth) {
    // Generate list of all possible moves for the next state.
    var moveList = generateMoves(boardInfo);

    // No possible moves (leaf node).
    if (moveList.length === 0 ||
        depth === 0) {
        return {
            score: evaluateScore(boardInfo, myMarker)
        };
    }

    var bestCell = null;

    // For all the possible moves, recursively evaluate the next move - expand the tree.
    for (var i = 0; i < moveList.length; i++) {
        var cell = moveList[i];
        var score;

        if (operation === Operation.Max) {
            // Change the board state.
            boardInfo.cells[cell.x][cell.y] = myMarker;

            // Evaluate.
            score = doAlphaBetaPruningImpl(boardInfo, myMarker, alpha, beta, Operation.Min, depth - 1).score;

            // Maximize.
            if (score > alpha) {
                alpha = score;
                bestCell = cell;
                assert(bestCell !== null);
            }
        } else {
            // Change the board state.
            boardInfo.cells[cell.x][cell.y] = util.getOppositeMarker(myMarker);

            // Evaluate.
            score = doAlphaBetaPruningImpl(boardInfo, myMarker, alpha, beta, Operation.Max, depth - 1).score;

            // Minimize.
            if (score < beta) {
                beta = score;
                bestCell = cell;
                assert(bestCell !== null);
            }
        }

        // Undo board state change.
        boardInfo.cells[cell.x][cell.y] = null;

        // Cut-off.
        if (alpha >= beta) {
            break;
        }
    }

    return {
        score: (operation === Operation.Max) ? alpha : beta,
        cell: bestCell
    };
}

function generateMoves(boardInfo) {
    var moveList = [];

    // If board is already won, treat it as no moves available.
    if (util.checkWin(boardInfo.cells, util.Marker.X) ||
        util.checkWin(boardInfo.cells, util.Marker.O)) {
        return moveList;
    }

    for (var y = 0; y < boardInfo.rowCount; y++) {
        for (var x = 0; x < boardInfo.colCount; x++) {
            if (util.canPlaceMarker(x, y, boardInfo.cells)) {
                moveList.push({ x: x, y: y });
            }
        }
    }
    return moveList;
}

function evaluateScore(boardInfo, myMarker) {
    // Basic evaluation function that returns 3 conditions (win, lose, draw).
    // When evaluating the entire game tree, this will work.
    // When evaluating only part of the game tree (limited plies), a heuristic is required.
    if (util.checkWin(boardInfo.cells, myMarker)) {
        return 1;
    } else if (util.checkWin(boardInfo.cells, util.getOppositeMarker(myMarker))) {
        return -1;
    } else {
        return 0;
    }
}

/**
 * Execute an AI turn.
 * Returns the cell {x, y} of the move, or null if not finished moving yet.
 */
function getMove(boardInfo, myMarker) {
    switch (ACTIVE_AI_STRATEGY) {
        case AiStrategy.RandomOpenCell:
            return doRandomOpenCell(boardInfo);
        case AiStrategy.Minimax:
            return doMinimax(boardInfo, myMarker);
        case AiStrategy.AlphaBetaPruning:
            return doAlphaBetaPruning(boardInfo, myMarker);
    }
}

module.exports = {
    getMove: getMove,
    generateMoves: generateMoves,
    evaluateScore: evaluateScore,

    doRandomOpenCell: doRandomOpenCell,
    doMinimax: doMinimax,
    doAlphaBetaPruning: doAlphaBetaPruning,
};

},{"./util":4,"assert":10}],3:[function(require,module,exports){
'use strict';

var inherits = require('inherits'),
    Component = require('component-engine').Component,
    assert = require('assert'),
    util = require ('./util'),
    AiPlayer = require('./ai_player');

var LINE_WIDTH = 10;
var LINE_HEIGHT = 200;
var CELL_SIZE = LINE_HEIGHT / 3;
var HALF_CELL_SIZE = CELL_SIZE * 0.5;

var CELL_HOVER_COLOR = 0xFFFF00;

var ROW_COUNT = 3;
var COL_COUNT = 3;

var KEY_CODE_R = 82;

// Amount of time for the AI to execute a single turn.
var AI_TURN_TIME = 1.0;

var Marker = util.Marker;

function GameComponent (entity) {
    Component.call(this, entity);

    this.engine = entity.engine;

    this.projector = new THREE.Projector();
	this.raycaster = new THREE.Raycaster();
}

inherits(GameComponent, Component);

GameComponent.prototype.start = function () {
    this._buildBoard();
    this._startNewGame();
};

GameComponent.prototype._logNextTurn = function () {
    if (this.isMyTurn) {
        console.log('Your turn (' + this.myMarker + ').');
    } else {
        console.log('Computer\'s turn (' + this.otherMarker + ').');
    }
};

GameComponent.prototype._startNewGame = function () {
    this._resetBoard();

    this.isGameOver = false;
    this.aiTurnElapsedTime = 0.0;

    if (typeof this.myMarker === "undefined") {
        this.myMarker = Marker.X;
    } else {
        this.myMarker = util.getOppositeMarker(this.myMarker);
    }

    this.otherMarker = util.getOppositeMarker(this.myMarker);

    if (this.myMarker === Marker.X) {
        console.log('You are X and go first.');
        this.isMyTurn = true;
    } else {
        console.log('You are O. Computer goes first.');
        this.isMyTurn = false;
    }

    this._logNextTurn();
};

GameComponent.prototype._buildBoard = function () {
    var centerPos = this.entity.position.clone();
    var lineMat = new THREE.MeshNormalMaterial();

    // Cells.
    var l0 = new THREE.Mesh(new THREE.BoxGeometry(LINE_WIDTH, LINE_HEIGHT, LINE_WIDTH), lineMat);
    l0.position.set(centerPos.x - HALF_CELL_SIZE, centerPos.y, centerPos.z);
    var l1 = new THREE.Mesh(new THREE.BoxGeometry(LINE_WIDTH, LINE_HEIGHT, LINE_WIDTH), lineMat);
    l1.position.set(centerPos.x + HALF_CELL_SIZE, centerPos.y, centerPos.z);
    var l2 = new THREE.Mesh(new THREE.BoxGeometry(LINE_HEIGHT, LINE_WIDTH, LINE_WIDTH), lineMat);
    l2.position.set(centerPos.x, centerPos.y + HALF_CELL_SIZE, centerPos.z);
    var l3 = new THREE.Mesh(new THREE.BoxGeometry(LINE_HEIGHT, LINE_WIDTH, LINE_WIDTH), lineMat);
    l3.position.set(centerPos.x, centerPos.y - HALF_CELL_SIZE, centerPos.z);

    this.engine.scene.add(l0);
    this.engine.scene.add(l1);
    this.engine.scene.add(l2);
    this.engine.scene.add(l3);

    // Triggers - regions for mouse click raycasting.
    this.triggerObjects = [];
    this.triggerObjectCells = [];

    for (var y = 0; y < ROW_COUNT; y++) {
        for (var x = 0; x < COL_COUNT; x++) {
            var pos = this._getCellCenterPosition(x, y);
            var triggerObject = new THREE.Mesh(
                new THREE.BoxGeometry(CELL_SIZE - LINE_WIDTH, CELL_SIZE - LINE_WIDTH, LINE_WIDTH),
                new THREE.MeshBasicMaterial());
            triggerObject.visible = false;
            triggerObject.position.copy(pos);

            this.triggerObjects.push(triggerObject);
            this.triggerObjectCells.push({ x: x, y: y });
        }
    }
    for (var i = 0; i < this.triggerObjects.length; i++) {
        this.engine.scene.add(this.triggerObjects[i]);
    }

    // Hover Object - reacts on mouse hover to show available locations.
    var hoverObjectMesh = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), new THREE.MeshBasicMaterial());
    this.hoverObject = new THREE.BoxHelper(hoverObjectMesh);
    this.hoverObject.material.color.set(CELL_HOVER_COLOR);
    this.hoverObject.visible = false;
    this.engine.scene.add(this.hoverObject);

    // Allocate cells.
    this.cells = util.createBoard(COL_COUNT, ROW_COUNT);
};

GameComponent.prototype._resetBoard = function () {
    // Remove all active objects from scene.
    if (this.markerObjects) {
        for (var i = 0; i < this.markerObjects.length; i++) {
            this.engine.scene.remove(this.markerObjects[i]);
        }
    }

    this.markerObjects = [];

    // Reset cells.
    for (var y = 0; y < ROW_COUNT; y++) {
        for (var x = 0; x < COL_COUNT; x++) {
            this.cells[x][y] = null;
        }
    }
};

GameComponent.prototype._getCellCenterPosition = function (x, y) {
    return new THREE.Vector3(
        (x - 1) * CELL_SIZE + this.entity.position.x,
        -((y - 1) * CELL_SIZE) + this.entity.position.y,
        this.entity.position.z
    );
};

GameComponent.prototype._placeMarker = function (x, y, marker) {
    if (!util.canPlaceMarker(x, y, this.cells)) {
        return;
    }

    this.cells[x][y] = marker;

    var mat;

    if (marker === Marker.X) {
        mat = new THREE.MeshBasicMaterial({color: 0xFF0000 });
    } else {
        mat = new THREE.MeshBasicMaterial({color: 0x00FF00 });
    }

    var object = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), mat);
    object.position.copy(this._getCellCenterPosition(x, y));
    this.engine.scene.add(object);

    this.markerObjects.push(object);
};

GameComponent.prototype.update = function() {
    this._updateGameState();

    // if (this.isGameOver)
    if (this.engine.isKeyDown(KEY_CODE_R)) {
        console.log('Restarting game...');
        this._resetBoard();
        this._startNewGame();
    }
};

GameComponent.prototype._updateGameState = function () {
    if (this.isGameOver) {
        return;
    }

    var turnFinished = false;
    var activeMarker;

    if (this.isMyTurn) {
        activeMarker = this.myMarker;

        this._updatePlayerMouseHover();

        if (this.engine.isMouseButtonUp()) {
            var cell = this._getMouseCellIntersection();
            if (cell !== null) {
                if (util.canPlaceMarker(cell.x, cell.y, this.cells)) {
                    this._placeMarker(cell.x, cell.y, this.myMarker);
                    turnFinished = true;

                    this.hoverObject.visible = false;
                }
            }
        }
    } else {
        activeMarker = this.otherMarker;

        if (this.aiTurnElapsedTime >= AI_TURN_TIME) {
            var boardInfo = {
                rowCount: ROW_COUNT,
                colCount: COL_COUNT,
                cells: this.cells
            };

            var cell = AiPlayer.getMove(boardInfo, this.otherMarker);

            if (cell) {
                if (util.canPlaceMarker(cell.x, cell.y, this.cells)) {
                    this._placeMarker(cell.x, cell.y, this.otherMarker);
                } else {
                    console.warn('AI returned invalid move: ' + cell);
                }

                turnFinished = true;
                this.aiTurnElapsedTime = 0.0;
            }
        } else {
            this.aiTurnElapsedTime += this.engine.time.deltaTime;
        }
    }

    if (turnFinished) {
        if (util.checkWin(this.cells, activeMarker)) {
            if (activeMarker === this.myMarker) {
                console.log('You win (' + this.myMarker + ')!');
            } else {
                console.log('Computer wins (' + this.otherMarker + ')!');
            }
            this.isGameOver = true;
        } else if (util.isBoardFull(this.cells)) {
            console.log('Game ended in a draw!');
            this.isGameOver = true;
        }

        if (!this.isGameOver) {
            // Next turn.
            this.isMyTurn = !this.isMyTurn;
            this._logNextTurn();
        }
    }
};

GameComponent.prototype._updatePlayerMouseHover = function () {
    this.hoverObject.visible = false;

    var cell = this._getMouseCellIntersection();
    if (cell !== null) {
        if (util.canPlaceMarker(cell.x, cell.y, this.cells)) {
            var pos = this._getCellCenterPosition(cell.x, cell.y);
            this.hoverObject.position.copy(pos);
            this.hoverObject.updateMatrix();
            this.hoverObject.visible = true;
        }
    }
};

GameComponent.prototype._getMouseCellIntersection = function () {
    // Screen to normalized coordinates (-1, 1).
    var vector = new THREE.Vector3(
        (this.engine.mousePosition.x / this.engine.width) * 2 - 1,
        (this.engine.mousePosition.y / this.engine.height) * 2 - 1,
        1);
    this.projector.unprojectVector(vector, this.engine.camera);
    this.raycaster.set(this.engine.camera.position, vector.sub(this.engine.camera.position).normalize());

    var intersects = this.raycaster.intersectObjects(this.triggerObjects);
    if (intersects.length > 0) {
        var cell = null;
        for (var i = 0; i < this.triggerObjects.length; i++) {
            if (intersects[0].object === this.triggerObjects[i]) {
                cell = this.triggerObjectCells[i];
                break;
            }
        }
        assert(cell !== null);
        return cell;
    }

    // No intersection.
    return null;
};

var DEGREES_PER_SECOND = 90.0;

module.exports = GameComponent;

},{"./ai_player":2,"./util":4,"assert":10,"component-engine":5,"inherits":9}],4:[function(require,module,exports){
'use strict';

var Marker = {
    X: 'X',
    O: 'O'
};

function getScore(cells, marker) {
    var colCount = cells.length;
    var rowCount = cells[0].length;

    var cnt = 0;
    var totalScore = 0;
    for (var y = 0; y < rowCount; y++) {
        for (var x = 0; x < colCount; x++) {
            if (cells[x][y] === marker) {
                totalScore += (1 << cnt);
            }
            cnt++;
        }
    }

    return totalScore;
}

module.exports = {
    Marker: Marker,

    createBoard: function(colCount, rowCount) {
        var cells = [];
        for (var x = 0; x < colCount; x++) {
            var col = [];
            for (var y = 0; y < rowCount; y++) {
                col.push(null);
            }
            cells.push(col);
        }
        return cells;
    },

    getOppositeMarker: function(marker) {
        return (marker === Marker.X) ? Marker.O : Marker.X;
    },

    canPlaceMarker: function(x, y, cells) {
        return (cells[x][y] === null);
    },

    isBoardFull: function(cells) {
        for (var x = 0; x < cells.length; x++) {
            for (var y = 0; y < cells[x].length; y++) {
                if (cells[x][y] === null) {
                    return false;
                }
            }
        }
        return true;
    },

    checkWin: function(cells, marker) {
        /*
            For the win-state calculation, assign each cell a unique bit (up to 9 bits).
            Find the possible 'winning scores' by summing the score for the cells in
            the winning directions.
            This gives us 8 (3 vertical, 3 horizontal, 2 diagonal) winning scores that
            need to be checked.
            If any of these scores (masked) has been attained, the game has been won.

              1   | 2   | 4   - (7)
             ----- ----- -----
              8   | 16  | 32  - (56)
             ----- ----- -----
              64  | 128 | 256 - (448)
            /  |     |     |  \
        (84)  (73) (146) (292) (273)
        */

        var winScores = [7, 56, 448, 73, 146, 292, 84, 273];

        var didWin = false;
        var score = getScore(cells, marker);
        for (var i = 0; i < winScores.length; i++) {
            if ((score & winScores [i]) === winScores [i]) {
                return true;
            }
        }

        return false;
    }
};

},{}],5:[function(require,module,exports){
module.exports = {
    Engine: require('./lib/engine'),
    Entity: require('./lib/entity'),
    Component: require('./lib/component')
};

},{"./lib/component":6,"./lib/engine":7,"./lib/entity":8}],6:[function(require,module,exports){
'use strict';

/**
 * Base class for all components.
 */
function Component (entity, params) {
    this.entity = entity;

    params = params || {};

    // Allow derived components to disable update call.
    this.requireUpdate = (typeof params.requireUpdate === 'undefined') ? true : params.requireUpdate;

    // Allow callbacks and other logic to be setup from outside of the component.
    // Allows easier re-use of components.
    this.onStart = null;
}

Component.prototype.startImpl = function () {
    this.start();

    if (this.onStart) {
        this.onStart();
    }
};

Component.prototype.start = function () {

};

Component.prototype.destroy = function() {

};

Component.prototype.update = function() {

};

module.exports = Component;

},{}],7:[function(require,module,exports){
'use strict';

require('inherits')(Engine, require('events').EventEmitter);

function Engine(options) {
    this.THREE = THREE;

    this.canvas = document.getElementById("canvas");
    if (!this.canvas) {
        throw "'canvas' element not found.";
    }

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this._initRenderer(options);

    this.prevTime = Date.now() / 1000;
    this.time = {
        // The time in seconds it took to complete the last frame.
        deltaTime: 0,
        // The total number of frames that have passed.
        frameCount: 0
    };

    document.addEventListener('keydown', this._onKeyDown.bind(this), false);
    document.addEventListener('keyup', this._onKeyUp.bind(this), false);
    this.keyStates = [];
}

Engine.prototype._initRenderer = function(options) {
    // TODO: split camera options into separate 'view' object to allow multiple cameras/scenes to exist
    // within the same game. Scenes should be bindable to cameras for rendering.
    this.fov = (typeof options.fov === "undefined") ? 60 : options.fov;

    if (options.orthographic) {
        var viewSize = this.height / 2;
        var aspectRatio = this.width / this.height;
        this.camera = new THREE.OrthographicCamera(
            -aspectRatio * viewSize, aspectRatio * viewSize,
            viewSize, -viewSize,
            0.1, 10000);
    } else {
        this.camera = new THREE.PerspectiveCamera(
            this.fov,
            this.width / this.height,
            0.1, 10000);
    }
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.scene = new THREE.Scene();
    this.renderer = new THREE.WebGLRenderer( { canvas : this.canvas });

    var clearColor = (typeof options.clearColor === "undefined") ? 0xFFFFFF : options.clearColor;
    this.renderer.setClearColor(clearColor, 1);
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    window.addEventListener('resize', this._onWindowResize.bind(this), false);
    this.canvas.addEventListener('mousedown', this._onCanvasMouseDown.bind(this), false);
    this.canvas.addEventListener('mouseup', this._onCanvasMouseUp.bind(this), false);
    this.canvas.addEventListener('mousemove', this._onCanvasMouseMove.bind(this), false);

    this.mouseButtonStates = [];
    this.mousePosition = new THREE.Vector2();
};

Engine.prototype._onWindowResize = function() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.width = this.canvas.width;
    this.height = this.canvas.height;

    this.emit('windowResize');
};

var InputState = {
    NONE: 0,
    DOWN: 1,
    UP: 2,
    PRESSED: 3,
};

var MouseButton = {
    LEFT: 1,
    RIGHT: 2,
    MIDDLE: 3,
};

function mouseEventToXY(engine, event) {
    var x = 0;
    var y = 0;

    if (event.x !== undefined && event.y !== undefined) {
        x = event.x;
        y = event.y;
    }
    // Firefox method to get the position.
    else {
        x = event.clientX + document.body.scrollLeft +
          document.documentElement.scrollLeft;
        y = event.clientY + document.body.scrollTop +
          document.documentElement.scrollTop;
    }

    x -= engine.canvas.offsetLeft;
    y -= engine.canvas.offsetTop;

    // Account window scrolling via scrollbars.
    x += window.pageXOffset;
    y += window.pageYOffset;

    // Flip y coordinate so that y = 0 is bottom.
    y = engine.canvas.height - y - 1;

    return {
        x: x,
        y: y
    };
}

function mouseEventToButton(event) {
    return event.which || event.button;
}

/**
 * Was the mouse button pushed down this frame?
 */
Engine.prototype.isMouseButtonDown = function (buttonIndex) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.DOWN;
};

/**
 * Was the mouse button lifted up this frame?
 */
Engine.prototype.isMouseButtonUp = function (buttonIndex) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.UP;
};

/**
 * Is the mouse button pressed down?
 */
Engine.prototype.isMouseButtonPressed = function (buttonIndex) {
    return this.mouseButtonStates[MouseButton.LEFT] === InputState.PRESSED;
};

Engine.prototype._onCanvasMouseDown = function(event) {
    event.preventDefault();

    var button = mouseEventToButton(event);
    this.mouseButtonStates[button] = InputState.DOWN;
};

Engine.prototype._onCanvasMouseUp = function(event) {
    event.preventDefault();

    var button = mouseEventToButton(event);
    this.mouseButtonStates[button] = InputState.UP;
};

Engine.prototype._onCanvasMouseMove = function(event) {
    event.preventDefault();

    var mousePos = mouseEventToXY(this, event);
    this.mousePosition.set(mousePos.x, mousePos.y);
};

/**
 * Was the key pushed down this frame?
 */
Engine.prototype.isKeyDown = function (keyCode) {
    return this.keyStates[keyCode] === InputState.DOWN;
};

/**
 * Was the key released this frame?
 */
Engine.prototype.isKeyUp = function (keyCode) {
    return this.keyStates[keyCode] === InputState.UP;
};

/**
 * Is the key pressed down?
 */
Engine.prototype.isKeyPressed = function (keyCode) {
    return this.keyStates[keyCode] === InputState.PRESSED;
};

Engine.prototype._onKeyDown = function (event) {
    this.keyStates[event.keyCode] = InputState.DOWN;
};

Engine.prototype._onKeyUp = function (event) {
    this.keyStates[event.keyCode] = InputState.UP;
};

/**
 * Start the engine loop.
 */
Engine.prototype.run = function() {
    this._update();
};

Engine.prototype._update = function() {
    var time = Date.now() / 1000;
    this.time.deltaTime = time - this.prevTime;

    this.emit('update');
    this.emit('lateUpdate');

    this._render();
    this._updateInputStates();

    this.emit('frameEnd');

    this.time.frameCount += 1;
    this.prevTime = time;

    window.requestAnimationFrame(this._update.bind(this));
};

Engine.prototype._updateInputStates = function () {
    // Mouse states.
    for (var i in this.mouseButtonStates) {
        switch (this.mouseButtonStates[i]) {
            case InputState.DOWN:
                this.mouseButtonStates[i] = InputState.PRESSED;
                break;
            case InputState.UP:
                this.mouseButtonStates[i] = InputState.NONE;
                break;
        }
    }

    // Key states.
    for (i in this.keyStates) {
        switch (this.keyStates[i]) {
            case InputState.DOWN:
                this.keyStates[i] = InputState.PRESSED;
                break;
            case InputState.UP:
                this.keyStates[i] = InputState.NONE;
                break;
        }
    }
};

Engine.prototype._render = function() {
    this.emit('render');

    this.renderer.clearDepth();
    this.renderer.render(this.scene, this.camera);
};

module.exports = Engine;

},{"events":13,"inherits":9}],8:[function(require,module,exports){
'use strict';

var Vector3 = THREE.Vector3,
    EventEmitter = require("events").EventEmitter;

function Entity (engine) {
    this.engine = engine;
    this.position = new Vector3();
    this.components = [];
    this.updateableComponents = [];
    this.eventEmitter = new EventEmitter();

    this.engine.on('update', this._update.bind(this));

    this.didCallStart = false;
}

Entity.prototype._start = function () {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].startImpl();
    }

    this.didCallStart = true;
};

Entity.prototype.destroy = function() {
    for (var i = 0; i < this.components.length; i++) {
        this.components[i].destroy();
    }

    this.eventEmitter.removeAllListeners();
    this.engine.removeListener('update', this._update.bind(this));
};

/**
 * Add a component to this entity.
 */
Entity.prototype.addComponent = function(component) {
    this.components.push(component);

    if (component.requireUpdate) {
        this.updateableComponents.push(component);
    }
};

/**
 * Gets a component by class (constructor) name.
 * Returns null if the component is not found.
 */
Entity.prototype.getComponent = function(componentName) {
    for (var i = 0; i < this.components.length; i++) {
        if (this.components[i].constructor.name == componentName) {
            return this.components[i];
        }
    }

    return null;
};

/**
 * Send a signal to the entity which can be handled by a component
 * of this entity.
 */
Entity.prototype.sendSignal = function (signalType) {
    switch (arguments.length) {
        case 1:
            this.eventEmitter.emit(signalType);
            break;
        case 2:
            this.eventEmitter.emit(signalType, arguments[1]);
            break;
        case 3:
            this.eventEmitter.emit(signalType, arguments[1], arguments[2]);
            break;
        default:
            // Slowest case - for multiple arguments.
            var len = arguments.length;
            var args = new Array(len - 1);
            for (var i = 1; i < len; i++) {
                args[i - 1] = arguments[i];
            }
            this.eventEmitter.emit(signalType, args);
    }
};

/**
 * Add a listener to handle the given signal type.
 */
Entity.prototype.addSignalListener = function (signalType, listener) {
    this.eventEmitter.addListener(signalType, listener);
};

/**
 * Remove a listener from handling the given signal type.
 */
Entity.prototype.removeSignalListener = function (signalType, listener) {
    this.eventEmitter.removeListener(signalType, listener);
};

Entity.prototype._update = function() {
    // Trigger 'start' on first update.
    if (!this.didCallStart) {
        this._start();
    }

    for (var i = 0; i < this.updateableComponents.length; i++) {
        this.updateableComponents[i].update();
    }
};

module.exports = Entity;

},{"events":13}],9:[function(require,module,exports){
if (typeof Object.create === 'function') {
  // implementation from standard node.js 'util' module
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
} else {
  // old school shim for old browsers
  module.exports = function inherits(ctor, superCtor) {
    ctor.super_ = superCtor
    var TempCtor = function () {}
    TempCtor.prototype = superCtor.prototype
    ctor.prototype = new TempCtor()
    ctor.prototype.constructor = ctor
  }
}

},{}],10:[function(require,module,exports){
// http://wiki.commonjs.org/wiki/Unit_Testing/1.0
//
// THIS IS NOT TESTED NOR LIKELY TO WORK OUTSIDE V8!
//
// Originally from narwhal.js (http://narwhaljs.org)
// Copyright (c) 2009 Thomas Robinson <280north.com>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the 'Software'), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
// ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
// WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

// when used in node, this will actually load the util module we depend on
// versus loading the builtin util module as happens otherwise
// this is a bug in node module loading as far as I am concerned
var util = require('util/');

var pSlice = Array.prototype.slice;
var hasOwn = Object.prototype.hasOwnProperty;

// 1. The assert module provides functions that throw
// AssertionError's when particular conditions are not met. The
// assert module must conform to the following interface.

var assert = module.exports = ok;

// 2. The AssertionError is defined in assert.
// new assert.AssertionError({ message: message,
//                             actual: actual,
//                             expected: expected })

assert.AssertionError = function AssertionError(options) {
  this.name = 'AssertionError';
  this.actual = options.actual;
  this.expected = options.expected;
  this.operator = options.operator;
  if (options.message) {
    this.message = options.message;
    this.generatedMessage = false;
  } else {
    this.message = getMessage(this);
    this.generatedMessage = true;
  }
  var stackStartFunction = options.stackStartFunction || fail;

  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, stackStartFunction);
  }
  else {
    // non v8 browsers so we can have a stacktrace
    var err = new Error();
    if (err.stack) {
      var out = err.stack;

      // try to strip useless frames
      var fn_name = stackStartFunction.name;
      var idx = out.indexOf('\n' + fn_name);
      if (idx >= 0) {
        // once we have located the function frame
        // we need to strip out everything before it (and its line)
        var next_line = out.indexOf('\n', idx + 1);
        out = out.substring(next_line + 1);
      }

      this.stack = out;
    }
  }
};

// assert.AssertionError instanceof Error
util.inherits(assert.AssertionError, Error);

function replacer(key, value) {
  if (util.isUndefined(value)) {
    return '' + value;
  }
  if (util.isNumber(value) && (isNaN(value) || !isFinite(value))) {
    return value.toString();
  }
  if (util.isFunction(value) || util.isRegExp(value)) {
    return value.toString();
  }
  return value;
}

function truncate(s, n) {
  if (util.isString(s)) {
    return s.length < n ? s : s.slice(0, n);
  } else {
    return s;
  }
}

function getMessage(self) {
  return truncate(JSON.stringify(self.actual, replacer), 128) + ' ' +
         self.operator + ' ' +
         truncate(JSON.stringify(self.expected, replacer), 128);
}

// At present only the three keys mentioned above are used and
// understood by the spec. Implementations or sub modules can pass
// other keys to the AssertionError's constructor - they will be
// ignored.

// 3. All of the following functions must throw an AssertionError
// when a corresponding condition is not met, with a message that
// may be undefined if not provided.  All assertion methods provide
// both the actual and expected values to the assertion error for
// display purposes.

function fail(actual, expected, message, operator, stackStartFunction) {
  throw new assert.AssertionError({
    message: message,
    actual: actual,
    expected: expected,
    operator: operator,
    stackStartFunction: stackStartFunction
  });
}

// EXTENSION! allows for well behaved errors defined elsewhere.
assert.fail = fail;

// 4. Pure assertion tests whether a value is truthy, as determined
// by !!guard.
// assert.ok(guard, message_opt);
// This statement is equivalent to assert.equal(true, !!guard,
// message_opt);. To test strictly for the value true, use
// assert.strictEqual(true, guard, message_opt);.

function ok(value, message) {
  if (!value) fail(value, true, message, '==', assert.ok);
}
assert.ok = ok;

// 5. The equality assertion tests shallow, coercive equality with
// ==.
// assert.equal(actual, expected, message_opt);

assert.equal = function equal(actual, expected, message) {
  if (actual != expected) fail(actual, expected, message, '==', assert.equal);
};

// 6. The non-equality assertion tests for whether two objects are not equal
// with != assert.notEqual(actual, expected, message_opt);

assert.notEqual = function notEqual(actual, expected, message) {
  if (actual == expected) {
    fail(actual, expected, message, '!=', assert.notEqual);
  }
};

// 7. The equivalence assertion tests a deep equality relation.
// assert.deepEqual(actual, expected, message_opt);

assert.deepEqual = function deepEqual(actual, expected, message) {
  if (!_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'deepEqual', assert.deepEqual);
  }
};

function _deepEqual(actual, expected) {
  // 7.1. All identical values are equivalent, as determined by ===.
  if (actual === expected) {
    return true;

  } else if (util.isBuffer(actual) && util.isBuffer(expected)) {
    if (actual.length != expected.length) return false;

    for (var i = 0; i < actual.length; i++) {
      if (actual[i] !== expected[i]) return false;
    }

    return true;

  // 7.2. If the expected value is a Date object, the actual value is
  // equivalent if it is also a Date object that refers to the same time.
  } else if (util.isDate(actual) && util.isDate(expected)) {
    return actual.getTime() === expected.getTime();

  // 7.3 If the expected value is a RegExp object, the actual value is
  // equivalent if it is also a RegExp object with the same source and
  // properties (`global`, `multiline`, `lastIndex`, `ignoreCase`).
  } else if (util.isRegExp(actual) && util.isRegExp(expected)) {
    return actual.source === expected.source &&
           actual.global === expected.global &&
           actual.multiline === expected.multiline &&
           actual.lastIndex === expected.lastIndex &&
           actual.ignoreCase === expected.ignoreCase;

  // 7.4. Other pairs that do not both pass typeof value == 'object',
  // equivalence is determined by ==.
  } else if (!util.isObject(actual) && !util.isObject(expected)) {
    return actual == expected;

  // 7.5 For all other Object pairs, including Array objects, equivalence is
  // determined by having the same number of owned properties (as verified
  // with Object.prototype.hasOwnProperty.call), the same set of keys
  // (although not necessarily the same order), equivalent values for every
  // corresponding key, and an identical 'prototype' property. Note: this
  // accounts for both named and indexed properties on Arrays.
  } else {
    return objEquiv(actual, expected);
  }
}

function isArguments(object) {
  return Object.prototype.toString.call(object) == '[object Arguments]';
}

function objEquiv(a, b) {
  if (util.isNullOrUndefined(a) || util.isNullOrUndefined(b))
    return false;
  // an identical 'prototype' property.
  if (a.prototype !== b.prototype) return false;
  //~~~I've managed to break Object.keys through screwy arguments passing.
  //   Converting to array solves the problem.
  if (isArguments(a)) {
    if (!isArguments(b)) {
      return false;
    }
    a = pSlice.call(a);
    b = pSlice.call(b);
    return _deepEqual(a, b);
  }
  try {
    var ka = objectKeys(a),
        kb = objectKeys(b),
        key, i;
  } catch (e) {//happens when one is a string literal and the other isn't
    return false;
  }
  // having the same number of owned properties (keys incorporates
  // hasOwnProperty)
  if (ka.length != kb.length)
    return false;
  //the same set of keys (although not necessarily the same order),
  ka.sort();
  kb.sort();
  //~~~cheap key test
  for (i = ka.length - 1; i >= 0; i--) {
    if (ka[i] != kb[i])
      return false;
  }
  //equivalent values for every corresponding key, and
  //~~~possibly expensive deep test
  for (i = ka.length - 1; i >= 0; i--) {
    key = ka[i];
    if (!_deepEqual(a[key], b[key])) return false;
  }
  return true;
}

// 8. The non-equivalence assertion tests for any deep inequality.
// assert.notDeepEqual(actual, expected, message_opt);

assert.notDeepEqual = function notDeepEqual(actual, expected, message) {
  if (_deepEqual(actual, expected)) {
    fail(actual, expected, message, 'notDeepEqual', assert.notDeepEqual);
  }
};

// 9. The strict equality assertion tests strict equality, as determined by ===.
// assert.strictEqual(actual, expected, message_opt);

assert.strictEqual = function strictEqual(actual, expected, message) {
  if (actual !== expected) {
    fail(actual, expected, message, '===', assert.strictEqual);
  }
};

// 10. The strict non-equality assertion tests for strict inequality, as
// determined by !==.  assert.notStrictEqual(actual, expected, message_opt);

assert.notStrictEqual = function notStrictEqual(actual, expected, message) {
  if (actual === expected) {
    fail(actual, expected, message, '!==', assert.notStrictEqual);
  }
};

function expectedException(actual, expected) {
  if (!actual || !expected) {
    return false;
  }

  if (Object.prototype.toString.call(expected) == '[object RegExp]') {
    return expected.test(actual);
  } else if (actual instanceof expected) {
    return true;
  } else if (expected.call({}, actual) === true) {
    return true;
  }

  return false;
}

function _throws(shouldThrow, block, expected, message) {
  var actual;

  if (util.isString(expected)) {
    message = expected;
    expected = null;
  }

  try {
    block();
  } catch (e) {
    actual = e;
  }

  message = (expected && expected.name ? ' (' + expected.name + ').' : '.') +
            (message ? ' ' + message : '.');

  if (shouldThrow && !actual) {
    fail(actual, expected, 'Missing expected exception' + message);
  }

  if (!shouldThrow && expectedException(actual, expected)) {
    fail(actual, expected, 'Got unwanted exception' + message);
  }

  if ((shouldThrow && actual && expected &&
      !expectedException(actual, expected)) || (!shouldThrow && actual)) {
    throw actual;
  }
}

// 11. Expected to throw an error:
// assert.throws(block, Error_opt, message_opt);

assert.throws = function(block, /*optional*/error, /*optional*/message) {
  _throws.apply(this, [true].concat(pSlice.call(arguments)));
};

// EXTENSION! This is annoying to write outside this module.
assert.doesNotThrow = function(block, /*optional*/message) {
  _throws.apply(this, [false].concat(pSlice.call(arguments)));
};

assert.ifError = function(err) { if (err) {throw err;}};

var objectKeys = Object.keys || function (obj) {
  var keys = [];
  for (var key in obj) {
    if (hasOwn.call(obj, key)) keys.push(key);
  }
  return keys;
};

},{"util/":12}],11:[function(require,module,exports){
module.exports = function isBuffer(arg) {
  return arg && typeof arg === 'object'
    && typeof arg.copy === 'function'
    && typeof arg.fill === 'function'
    && typeof arg.readUInt8 === 'function';
}
},{}],12:[function(require,module,exports){
(function (process,global){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

var formatRegExp = /%[sdj%]/g;
exports.format = function(f) {
  if (!isString(f)) {
    var objects = [];
    for (var i = 0; i < arguments.length; i++) {
      objects.push(inspect(arguments[i]));
    }
    return objects.join(' ');
  }

  var i = 1;
  var args = arguments;
  var len = args.length;
  var str = String(f).replace(formatRegExp, function(x) {
    if (x === '%%') return '%';
    if (i >= len) return x;
    switch (x) {
      case '%s': return String(args[i++]);
      case '%d': return Number(args[i++]);
      case '%j':
        try {
          return JSON.stringify(args[i++]);
        } catch (_) {
          return '[Circular]';
        }
      default:
        return x;
    }
  });
  for (var x = args[i]; i < len; x = args[++i]) {
    if (isNull(x) || !isObject(x)) {
      str += ' ' + x;
    } else {
      str += ' ' + inspect(x);
    }
  }
  return str;
};


// Mark that a method should not be used.
// Returns a modified function which warns once by default.
// If --no-deprecation is set, then it is a no-op.
exports.deprecate = function(fn, msg) {
  // Allow for deprecating things in the process of starting up.
  if (isUndefined(global.process)) {
    return function() {
      return exports.deprecate(fn, msg).apply(this, arguments);
    };
  }

  if (process.noDeprecation === true) {
    return fn;
  }

  var warned = false;
  function deprecated() {
    if (!warned) {
      if (process.throwDeprecation) {
        throw new Error(msg);
      } else if (process.traceDeprecation) {
        console.trace(msg);
      } else {
        console.error(msg);
      }
      warned = true;
    }
    return fn.apply(this, arguments);
  }

  return deprecated;
};


var debugs = {};
var debugEnviron;
exports.debuglog = function(set) {
  if (isUndefined(debugEnviron))
    debugEnviron = process.env.NODE_DEBUG || '';
  set = set.toUpperCase();
  if (!debugs[set]) {
    if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
      var pid = process.pid;
      debugs[set] = function() {
        var msg = exports.format.apply(exports, arguments);
        console.error('%s %d: %s', set, pid, msg);
      };
    } else {
      debugs[set] = function() {};
    }
  }
  return debugs[set];
};


/**
 * Echos the value of a value. Trys to print the value out
 * in the best way possible given the different types.
 *
 * @param {Object} obj The object to print out.
 * @param {Object} opts Optional options object that alters the output.
 */
/* legacy: obj, showHidden, depth, colors*/
function inspect(obj, opts) {
  // default options
  var ctx = {
    seen: [],
    stylize: stylizeNoColor
  };
  // legacy...
  if (arguments.length >= 3) ctx.depth = arguments[2];
  if (arguments.length >= 4) ctx.colors = arguments[3];
  if (isBoolean(opts)) {
    // legacy...
    ctx.showHidden = opts;
  } else if (opts) {
    // got an "options" object
    exports._extend(ctx, opts);
  }
  // set default options
  if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
  if (isUndefined(ctx.depth)) ctx.depth = 2;
  if (isUndefined(ctx.colors)) ctx.colors = false;
  if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
  if (ctx.colors) ctx.stylize = stylizeWithColor;
  return formatValue(ctx, obj, ctx.depth);
}
exports.inspect = inspect;


// http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
inspect.colors = {
  'bold' : [1, 22],
  'italic' : [3, 23],
  'underline' : [4, 24],
  'inverse' : [7, 27],
  'white' : [37, 39],
  'grey' : [90, 39],
  'black' : [30, 39],
  'blue' : [34, 39],
  'cyan' : [36, 39],
  'green' : [32, 39],
  'magenta' : [35, 39],
  'red' : [31, 39],
  'yellow' : [33, 39]
};

// Don't use 'blue' not visible on cmd.exe
inspect.styles = {
  'special': 'cyan',
  'number': 'yellow',
  'boolean': 'yellow',
  'undefined': 'grey',
  'null': 'bold',
  'string': 'green',
  'date': 'magenta',
  // "name": intentionally not styling
  'regexp': 'red'
};


function stylizeWithColor(str, styleType) {
  var style = inspect.styles[styleType];

  if (style) {
    return '\u001b[' + inspect.colors[style][0] + 'm' + str +
           '\u001b[' + inspect.colors[style][1] + 'm';
  } else {
    return str;
  }
}


function stylizeNoColor(str, styleType) {
  return str;
}


function arrayToHash(array) {
  var hash = {};

  array.forEach(function(val, idx) {
    hash[val] = true;
  });

  return hash;
}


function formatValue(ctx, value, recurseTimes) {
  // Provide a hook for user-specified inspect functions.
  // Check that value is an object with an inspect function on it
  if (ctx.customInspect &&
      value &&
      isFunction(value.inspect) &&
      // Filter out the util module, it's inspect function is special
      value.inspect !== exports.inspect &&
      // Also filter out any prototype objects using the circular check.
      !(value.constructor && value.constructor.prototype === value)) {
    var ret = value.inspect(recurseTimes, ctx);
    if (!isString(ret)) {
      ret = formatValue(ctx, ret, recurseTimes);
    }
    return ret;
  }

  // Primitive types cannot have properties
  var primitive = formatPrimitive(ctx, value);
  if (primitive) {
    return primitive;
  }

  // Look up the keys of the object.
  var keys = Object.keys(value);
  var visibleKeys = arrayToHash(keys);

  if (ctx.showHidden) {
    keys = Object.getOwnPropertyNames(value);
  }

  // IE doesn't make error fields non-enumerable
  // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
  if (isError(value)
      && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
    return formatError(value);
  }

  // Some type of object without properties can be shortcutted.
  if (keys.length === 0) {
    if (isFunction(value)) {
      var name = value.name ? ': ' + value.name : '';
      return ctx.stylize('[Function' + name + ']', 'special');
    }
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    }
    if (isDate(value)) {
      return ctx.stylize(Date.prototype.toString.call(value), 'date');
    }
    if (isError(value)) {
      return formatError(value);
    }
  }

  var base = '', array = false, braces = ['{', '}'];

  // Make Array say that they are Array
  if (isArray(value)) {
    array = true;
    braces = ['[', ']'];
  }

  // Make functions say that they are functions
  if (isFunction(value)) {
    var n = value.name ? ': ' + value.name : '';
    base = ' [Function' + n + ']';
  }

  // Make RegExps say that they are RegExps
  if (isRegExp(value)) {
    base = ' ' + RegExp.prototype.toString.call(value);
  }

  // Make dates with properties first say the date
  if (isDate(value)) {
    base = ' ' + Date.prototype.toUTCString.call(value);
  }

  // Make error with message first say the error
  if (isError(value)) {
    base = ' ' + formatError(value);
  }

  if (keys.length === 0 && (!array || value.length == 0)) {
    return braces[0] + base + braces[1];
  }

  if (recurseTimes < 0) {
    if (isRegExp(value)) {
      return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
    } else {
      return ctx.stylize('[Object]', 'special');
    }
  }

  ctx.seen.push(value);

  var output;
  if (array) {
    output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
  } else {
    output = keys.map(function(key) {
      return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
    });
  }

  ctx.seen.pop();

  return reduceToSingleString(output, base, braces);
}


function formatPrimitive(ctx, value) {
  if (isUndefined(value))
    return ctx.stylize('undefined', 'undefined');
  if (isString(value)) {
    var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                             .replace(/'/g, "\\'")
                                             .replace(/\\"/g, '"') + '\'';
    return ctx.stylize(simple, 'string');
  }
  if (isNumber(value))
    return ctx.stylize('' + value, 'number');
  if (isBoolean(value))
    return ctx.stylize('' + value, 'boolean');
  // For some reason typeof null is "object", so special case here.
  if (isNull(value))
    return ctx.stylize('null', 'null');
}


function formatError(value) {
  return '[' + Error.prototype.toString.call(value) + ']';
}


function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
  var output = [];
  for (var i = 0, l = value.length; i < l; ++i) {
    if (hasOwnProperty(value, String(i))) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          String(i), true));
    } else {
      output.push('');
    }
  }
  keys.forEach(function(key) {
    if (!key.match(/^\d+$/)) {
      output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
          key, true));
    }
  });
  return output;
}


function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
  var name, str, desc;
  desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
  if (desc.get) {
    if (desc.set) {
      str = ctx.stylize('[Getter/Setter]', 'special');
    } else {
      str = ctx.stylize('[Getter]', 'special');
    }
  } else {
    if (desc.set) {
      str = ctx.stylize('[Setter]', 'special');
    }
  }
  if (!hasOwnProperty(visibleKeys, key)) {
    name = '[' + key + ']';
  }
  if (!str) {
    if (ctx.seen.indexOf(desc.value) < 0) {
      if (isNull(recurseTimes)) {
        str = formatValue(ctx, desc.value, null);
      } else {
        str = formatValue(ctx, desc.value, recurseTimes - 1);
      }
      if (str.indexOf('\n') > -1) {
        if (array) {
          str = str.split('\n').map(function(line) {
            return '  ' + line;
          }).join('\n').substr(2);
        } else {
          str = '\n' + str.split('\n').map(function(line) {
            return '   ' + line;
          }).join('\n');
        }
      }
    } else {
      str = ctx.stylize('[Circular]', 'special');
    }
  }
  if (isUndefined(name)) {
    if (array && key.match(/^\d+$/)) {
      return str;
    }
    name = JSON.stringify('' + key);
    if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
      name = name.substr(1, name.length - 2);
      name = ctx.stylize(name, 'name');
    } else {
      name = name.replace(/'/g, "\\'")
                 .replace(/\\"/g, '"')
                 .replace(/(^"|"$)/g, "'");
      name = ctx.stylize(name, 'string');
    }
  }

  return name + ': ' + str;
}


function reduceToSingleString(output, base, braces) {
  var numLinesEst = 0;
  var length = output.reduce(function(prev, cur) {
    numLinesEst++;
    if (cur.indexOf('\n') >= 0) numLinesEst++;
    return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
  }, 0);

  if (length > 60) {
    return braces[0] +
           (base === '' ? '' : base + '\n ') +
           ' ' +
           output.join(',\n  ') +
           ' ' +
           braces[1];
  }

  return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
}


// NOTE: These type checking functions intentionally don't use `instanceof`
// because it is fragile and can be easily faked with `Object.create()`.
function isArray(ar) {
  return Array.isArray(ar);
}
exports.isArray = isArray;

function isBoolean(arg) {
  return typeof arg === 'boolean';
}
exports.isBoolean = isBoolean;

function isNull(arg) {
  return arg === null;
}
exports.isNull = isNull;

function isNullOrUndefined(arg) {
  return arg == null;
}
exports.isNullOrUndefined = isNullOrUndefined;

function isNumber(arg) {
  return typeof arg === 'number';
}
exports.isNumber = isNumber;

function isString(arg) {
  return typeof arg === 'string';
}
exports.isString = isString;

function isSymbol(arg) {
  return typeof arg === 'symbol';
}
exports.isSymbol = isSymbol;

function isUndefined(arg) {
  return arg === void 0;
}
exports.isUndefined = isUndefined;

function isRegExp(re) {
  return isObject(re) && objectToString(re) === '[object RegExp]';
}
exports.isRegExp = isRegExp;

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}
exports.isObject = isObject;

function isDate(d) {
  return isObject(d) && objectToString(d) === '[object Date]';
}
exports.isDate = isDate;

function isError(e) {
  return isObject(e) &&
      (objectToString(e) === '[object Error]' || e instanceof Error);
}
exports.isError = isError;

function isFunction(arg) {
  return typeof arg === 'function';
}
exports.isFunction = isFunction;

function isPrimitive(arg) {
  return arg === null ||
         typeof arg === 'boolean' ||
         typeof arg === 'number' ||
         typeof arg === 'string' ||
         typeof arg === 'symbol' ||  // ES6 symbol
         typeof arg === 'undefined';
}
exports.isPrimitive = isPrimitive;

exports.isBuffer = require('./support/isBuffer');

function objectToString(o) {
  return Object.prototype.toString.call(o);
}


function pad(n) {
  return n < 10 ? '0' + n.toString(10) : n.toString(10);
}


var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'];

// 26 Feb 16:19:34
function timestamp() {
  var d = new Date();
  var time = [pad(d.getHours()),
              pad(d.getMinutes()),
              pad(d.getSeconds())].join(':');
  return [d.getDate(), months[d.getMonth()], time].join(' ');
}


// log is just a thin wrapper to console.log that prepends a timestamp
exports.log = function() {
  console.log('%s - %s', timestamp(), exports.format.apply(exports, arguments));
};


/**
 * Inherit the prototype methods from one constructor into another.
 *
 * The Function.prototype.inherits from lang.js rewritten as a standalone
 * function (not on Function.prototype). NOTE: If this file is to be loaded
 * during bootstrapping this function needs to be rewritten using some native
 * functions as prototype setup using normal JavaScript does not work as
 * expected during bootstrapping (see mirror.js in r114903).
 *
 * @param {function} ctor Constructor function which needs to inherit the
 *     prototype.
 * @param {function} superCtor Constructor function to inherit prototype from.
 */
exports.inherits = require('inherits');

exports._extend = function(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || !isObject(add)) return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
};

function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

}).call(this,require("q+64fw"),typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./support/isBuffer":11,"inherits":14,"q+64fw":15}],13:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      } else {
        throw TypeError('Uncaught, unspecified "error" event.');
      }
      return false;
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}],14:[function(require,module,exports){
module.exports=require(9)
},{}],15:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    if (canPost) {
        var queue = [];
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
}

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1])