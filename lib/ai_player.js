'use strict';

var util = require('./util');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Dumb AI to randomly select an open space on the board.
 */
function getRandomOpenCell(boardInfo) {
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

/**
 * Execute an AI turn.
 * Returns the cell {x, y} of the move, or null if not finished moving yet.
 */
function _getBestMove(boardInfo, marker) {
    return getRandomOpenCell(boardInfo);
}

module.exports = {
    getBestMove: _getBestMove
};
