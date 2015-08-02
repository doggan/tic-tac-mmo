'use strict';

let App = require('./app'),
    THREE = require('three'),
    assert = require('assert'),
    game_util = require('./game_util'),
    Ai = require('./ai');

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

let Marker = game_util.Marker;

class GameComponent {
    constructor(options) {
        this._raycaster = new THREE.Raycaster();
        this._position = new THREE.Vector3(0, 0, 0);
    }

    start() {
        this._buildBoard();
        this._startNewGame();
    }

    _logNextTurn() {
        if (this._isMyTurn) {
            console.log('Your turn (' + this._myMarker + ').');
        } else {
            console.log('Computer\'s turn (' + this._otherMarker + ').');
        }
    }

    _startNewGame() {
        this._resetBoard();

        this._isGameOver = false;
        this._aiTurnElapsedTime = 0.0;

        this._myMarker = (typeof this._myMarker === 'undefined') ? Marker.X : game_util.getOppositeMarker(this._myMarker);
        this._otherMarker = game_util.getOppositeMarker(this._myMarker);
        this._isMyTurn = (this._myMarker === Marker.X) ? true : false;

        this._logNextTurn();
    }

    _buildBoard() {
        let centerPos = this._position.clone();
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

        App.activeScene.add(l0);
        App.activeScene.add(l1);
        App.activeScene.add(l2);
        App.activeScene.add(l3);

        // Triggers - regions for mouse click raycasting.
        this._triggerObjects = [];
        this._triggerObjectCells = [];

        for (let y = 0; y < ROW_COUNT; y++) {
            for (let x = 0; x < COL_COUNT; x++) {
                let pos = this._getCellCenterPosition(x, y);
                let triggerObject = new THREE.Mesh(
                    new THREE.BoxGeometry(CELL_SIZE - LINE_WIDTH, CELL_SIZE - LINE_WIDTH, LINE_WIDTH),
                    new THREE.MeshBasicMaterial());
                triggerObject.visible = false;
                triggerObject.position.copy(pos);

                this._triggerObjects.push(triggerObject);
                this._triggerObjectCells.push({
                    x: x,
                    y: y
                });
            }
        }
        for (let i = 0; i < this._triggerObjects.length; i++) {
            App.activeScene.add(this._triggerObjects[i]);
        }

        // Hover Object - reacts on mouse hover to show available locations.
        let hoverObjectMesh = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), new THREE.MeshBasicMaterial());
        this._hoverObject = new THREE.BoxHelper(hoverObjectMesh);
        this._hoverObject.material.color.set(CELL_HOVER_COLOR);
        this._hoverObject.visible = false;
        App.activeScene.add(this._hoverObject);

        // Allocate cells.
        this._cells = game_util.createBoard(COL_COUNT, ROW_COUNT);
    }

    _resetBoard() {
        // Remove all active objects from scene.
        if (this.markerObjects) {
            for (let i = 0; i < this.markerObjects.length; i++) {
                App.activeScene.remove(this.markerObjects[i]);
            }
        }

        this.markerObjects = [];

        // Reset cells.
        for (let y = 0; y < ROW_COUNT; y++) {
            for (let x = 0; x < COL_COUNT; x++) {
                this._cells[x][y] = null;
            }
        }
    }

    _getCellCenterPosition(x, y) {
        return new THREE.Vector3(
            (x - 1) * CELL_SIZE + this._position.x, -((y - 1) * CELL_SIZE) + this._position.y,
            this._position.z
        );
    }

    _placeMarker(x, y, marker) {
        if (!game_util.canPlaceMarker(x, y, this._cells)) {
            return;
        }

        this._cells[x][y] = marker;

        let mat;

        if (marker === Marker.X) {
            mat = new THREE.MeshBasicMaterial({
                color: 0xFF0000
            });
        } else {
            mat = new THREE.MeshBasicMaterial({
                color: 0x00FF00
            });
        }

        let object = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), mat);
        object.position.copy(this._getCellCenterPosition(x, y));
        App.activeScene.add(object);

        this.markerObjects.push(object);
    }

    update() {
        this._updateGameState();

        if (App.inputSystem.isKeyDown(KEY_CODE_R)) {
            console.log('Restarting game...');
            this._resetBoard();
            this._startNewGame();
        }
    }

    _updateGameState() {
        if (this._isGameOver) {
            return;
        }

        let turnFinished = false;
        let activeMarker;

        if (this._isMyTurn) {
            activeMarker = this._myMarker;

            this._updatePlayerMouseHover();

            if (App.inputSystem.isMouseButtonUp(App.inputSystem.MouseButton.LEFT)) {
                let cell = this._getMouseCellIntersection();
                if (cell !== null) {
                    if (game_util.canPlaceMarker(cell.x, cell.y, this._cells)) {
                        this._placeMarker(cell.x, cell.y, this._myMarker);
                        turnFinished = true;

                        this._hoverObject.visible = false;
                    }
                }
            }
        } else {
            activeMarker = this._otherMarker;

            if (this._aiTurnElapsedTime >= AI_TURN_TIME) {
                let boardInfo = {
                    rowCount: ROW_COUNT,
                    colCount: COL_COUNT,
                    cells: this._cells
                };

                let cell = Ai.getMove(boardInfo, this._otherMarker);

                if (cell) {
                    if (game_util.canPlaceMarker(cell.x, cell.y, this._cells)) {
                        this._placeMarker(cell.x, cell.y, this._otherMarker);
                    } else {
                        console.warn('AI returned invalid move: ' + cell);
                    }

                    turnFinished = true;
                    this._aiTurnElapsedTime = 0.0;
                }
            } else {
                this._aiTurnElapsedTime += App.deltaTime;
            }
        }

        if (turnFinished) {
            if (game_util.checkWin(this._cells, activeMarker)) {
                if (activeMarker === this._myMarker) {
                    console.log('You win (' + this._myMarker + ')!');
                } else {
                    console.log('Computer wins (' + this._otherMarker + ')!');
                }
                this._isGameOver = true;
            } else if (game_util.isBoardFull(this._cells)) {
                console.log('Game ended in a draw!');
                this._isGameOver = true;
            }

            // Next turn.
            if (!this._isGameOver) {
                this._isMyTurn = !this._isMyTurn;
                this._logNextTurn();
            }
        }
    }

    _updatePlayerMouseHover() {
        this._hoverObject.visible = false;

        let cell = this._getMouseCellIntersection();
        if (cell !== null) {
            if (game_util.canPlaceMarker(cell.x, cell.y, this._cells)) {
                let pos = this._getCellCenterPosition(cell.x, cell.y);
                this._hoverObject.position.copy(pos);
                this._hoverObject.updateMatrix();
                this._hoverObject.visible = true;
            }
        }
    }

    _getMouseCellIntersection() {
        // Screen to normalized coordinates (-1, 1).
        let vector = new THREE.Vector3(
            (App.inputSystem.getMousePosition().x / App.canvas.width) * 2 - 1, (App.inputSystem.getMousePosition().y / App.canvas.height) * 2 - 1,
            1);
        vector.unproject(App.activeCamera);
        this._raycaster.set(App.activeCamera.position, vector.sub(App.activeCamera.position).normalize());

        let intersects = this._raycaster.intersectObjects(this._triggerObjects);
        if (intersects.length > 0) {
            let cell = null;
            for (let i = 0; i < this._triggerObjects.length; i++) {
                if (intersects[0].object === this._triggerObjects[i]) {
                    cell = this._triggerObjectCells[i];
                    break;
                }
            }
            assert(cell !== null);
            return cell;
        }

        // No intersection.
        return null;
    }
}

module.exports = function(options) {
    return new GameComponent(options);
};
