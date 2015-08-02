'use strict';

let inherits = require('inherits'),
    Component = require('component-engine').Component,
    assert = require('assert'),
    util = require ('./util'),
    AiPlayer = require('./ai_player');

let LINE_WIDTH = 10;
let LINE_HEIGHT = 200;
let CELL_SIZE = LINE_HEIGHT / 3;
let HALF_CELL_SIZE = CELL_SIZE * 0.5;

let CELL_HOVER_COLOR = 0xFFFF00;

let ROW_COUNT = 3;
let COL_COUNT = 3;

let KEY_CODE_R = 82;

// Amount of time for the AI to execute a single turn.
let AI_TURN_TIME = 1.0;

let Marker = util.Marker;

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
    let centerPos = this.entity.position.clone();
    let lineMat = new THREE.MeshNormalMaterial();

    // Cells.
    let l0 = new THREE.Mesh(new THREE.BoxGeometry(LINE_WIDTH, LINE_HEIGHT, LINE_WIDTH), lineMat);
    l0.position.set(centerPos.x - HALF_CELL_SIZE, centerPos.y, centerPos.z);
    let l1 = new THREE.Mesh(new THREE.BoxGeometry(LINE_WIDTH, LINE_HEIGHT, LINE_WIDTH), lineMat);
    l1.position.set(centerPos.x + HALF_CELL_SIZE, centerPos.y, centerPos.z);
    let l2 = new THREE.Mesh(new THREE.BoxGeometry(LINE_HEIGHT, LINE_WIDTH, LINE_WIDTH), lineMat);
    l2.position.set(centerPos.x, centerPos.y + HALF_CELL_SIZE, centerPos.z);
    let l3 = new THREE.Mesh(new THREE.BoxGeometry(LINE_HEIGHT, LINE_WIDTH, LINE_WIDTH), lineMat);
    l3.position.set(centerPos.x, centerPos.y - HALF_CELL_SIZE, centerPos.z);

    this.engine.scene.add(l0);
    this.engine.scene.add(l1);
    this.engine.scene.add(l2);
    this.engine.scene.add(l3);

    // Triggers - regions for mouse click raycasting.
    this.triggerObjects = [];
    this.triggerObjectCells = [];

    for (let y = 0; y < ROW_COUNT; y++) {
        for (let x = 0; x < COL_COUNT; x++) {
            let pos = this._getCellCenterPosition(x, y);
            let triggerObject = new THREE.Mesh(
                new THREE.BoxGeometry(CELL_SIZE - LINE_WIDTH, CELL_SIZE - LINE_WIDTH, LINE_WIDTH),
                new THREE.MeshBasicMaterial());
            triggerObject.visible = false;
            triggerObject.position.copy(pos);

            this.triggerObjects.push(triggerObject);
            this.triggerObjectCells.push({ x: x, y: y });
        }
    }
    for (let i = 0; i < this.triggerObjects.length; i++) {
        this.engine.scene.add(this.triggerObjects[i]);
    }

    // Hover Object - reacts on mouse hover to show available locations.
    let hoverObjectMesh = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), new THREE.MeshBasicMaterial());
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
        for (let i = 0; i < this.markerObjects.length; i++) {
            this.engine.scene.remove(this.markerObjects[i]);
        }
    }

    this.markerObjects = [];

    // Reset cells.
    for (let y = 0; y < ROW_COUNT; y++) {
        for (let x = 0; x < COL_COUNT; x++) {
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

    let mat;

    if (marker === Marker.X) {
        mat = new THREE.MeshBasicMaterial({color: 0xFF0000 });
    } else {
        mat = new THREE.MeshBasicMaterial({color: 0x00FF00 });
    }

    let object = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), mat);
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

    let turnFinished = false;
    let activeMarker;

    if (this.isMyTurn) {
        activeMarker = this.myMarker;

        this._updatePlayerMouseHover();

        if (this.engine.isMouseButtonUp()) {
            let cell = this._getMouseCellIntersection();
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
            let boardInfo = {
                rowCount: ROW_COUNT,
                colCount: COL_COUNT,
                cells: this.cells
            };

            let cell = AiPlayer.getMove(boardInfo, this.otherMarker);

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

    let cell = this._getMouseCellIntersection();
    if (cell !== null) {
        if (util.canPlaceMarker(cell.x, cell.y, this.cells)) {
            let pos = this._getCellCenterPosition(cell.x, cell.y);
            this.hoverObject.position.copy(pos);
            this.hoverObject.updateMatrix();
            this.hoverObject.visible = true;
        }
    }
};

GameComponent.prototype._getMouseCellIntersection = function () {
    // Screen to normalized coordinates (-1, 1).
    let vector = new THREE.Vector3(
        (this.engine.mousePosition.x / this.engine.width) * 2 - 1,
        (this.engine.mousePosition.y / this.engine.height) * 2 - 1,
        1);
    this.projector.unprojectVector(vector, this.engine.camera);
    this.raycaster.set(this.engine.camera.position, vector.sub(this.engine.camera.position).normalize());

    let intersects = this.raycaster.intersectObjects(this.triggerObjects);
    if (intersects.length > 0) {
        let cell = null;
        for (let i = 0; i < this.triggerObjects.length; i++) {
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

module.exports = GameComponent;
