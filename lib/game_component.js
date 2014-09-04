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
};

GameComponent.prototype._resetBoard = function () {
    // Remove all active objects from scene.
    if (this.markerObjects) {
        for (var i = 0; i < this.markerObjects.length; i++) {
            this.engine.scene.remove(this.markerObjects[i]);
        }
    }

    this.cells = [];
    this.markerObjects = [];
};

function getScore(cells, marker) {
    var cnt = 0;
    var totalScore = 0;
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (cell.value === marker) {
            var cellIndex = cell.y * COL_COUNT + cell.x;
            totalScore += (1 << cellIndex);
        }
    }

    return totalScore;
}

function checkWin(cells, marker) {
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

    this.cells.push({
        x: x, y: y,
        value: marker
    });

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

            var cell = AiPlayer.getBestMove(boardInfo, this.otherMarker);

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
        if (checkWin(this.cells, activeMarker)) {
            if (activeMarker === this.myMarker) {
                console.log('You win (' + this.myMarker + ')!');
            } else {
                console.log('Computer wins (' + this.otherMarker + ')!');
            }
            this.isGameOver = true;
        } else if (this.cells.length === (COL_COUNT * ROW_COUNT)) {
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
