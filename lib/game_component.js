'use strict';

var inherits = require('inherits'),
    Component = require('component-engine').Component,
    assert = require('assert');

var LINE_WIDTH = 10;
var LINE_HEIGHT = 200;
var CELL_SIZE = LINE_HEIGHT / 3;
var HALF_CELL_SIZE = CELL_SIZE * 0.5;

var ROW_COUNT = 3;
var COL_COUNT = 3;

var Marker = {
    X: 0,
    O: 1
};

function GameComponent (entity) {
    Component.call(this, entity);

    this.engine = entity.engine;

    this.projector = new THREE.Projector();
	this.raycaster = new THREE.Raycaster();
}

inherits(GameComponent, Component);

GameComponent.prototype.start = function () {
    this._buildBoard();
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

    // Triggers.
    this.triggerObjects = [];
    this.triggerObjectCells = [];

    for (var y = 0; y < ROW_COUNT; y++) {
        for (var x = 0; x < COL_COUNT; x++) {
            var pos = this._getCellCenterPosition(x, y);
            var triggerObject = new THREE.Mesh(
                new THREE.BoxGeometry(CELL_SIZE - LINE_WIDTH, CELL_SIZE - LINE_WIDTH, LINE_WIDTH),
                new THREE.MeshBasicMaterial() );
            triggerObject.visible = false;
            triggerObject.position.copy(pos);

            this.triggerObjects.push(triggerObject);
            this.triggerObjectCells.push([x, y]);
        }
    }
    for (var i = 0; i < this.triggerObjects.length; i++) {
        this.engine.scene.add(this.triggerObjects[i]);
    }

    // Board state.
    this.cells = [];
    this.markerObjects = [];
};

GameComponent.prototype._getCellCenterPosition = function (x, y) {
    return new THREE.Vector3(
        (x - 1) * CELL_SIZE + this.entity.position.x,
        -((y - 1) * CELL_SIZE) + this.entity.position.y,
        this.entity.position.z - (LINE_WIDTH * 0.5)
    );
};

GameComponent.prototype._canPlaceMarker = function (x, y) {
    for (var i = 0; i < this.cells.length; i++) {
        var cell = this.cells[i];

        // Marker already exists at this position.
        if (cell[0] === x && cell[1] === y) {
            return false;
        }
    }

    return true;
};

GameComponent.prototype._placeMarker = function (x, y, marker) {
    if (!this._canPlaceMarker(x, y)) {
        return;
    }

    this.cells.push([x, y]);

    var mat = new THREE.MeshBasicMaterial({color: 0xFF0000 });
    var l0 = new THREE.Mesh(new THREE.BoxGeometry(HALF_CELL_SIZE, HALF_CELL_SIZE, LINE_WIDTH), mat);
    l0.position.copy(this._getCellCenterPosition(x, y));
    this.engine.scene.add(l0);
};

GameComponent.prototype.update = function() {
    if (this.engine.isMouseButtonDown()) {
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
            this._placeMarker(cell[0], cell[1], Marker.X);
        }
    }
};

module.exports = GameComponent;
