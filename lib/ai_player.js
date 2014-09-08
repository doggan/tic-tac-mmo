'use strict';

var util = require('./util'),
    assert = require('assert');

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

var Operation = {
    Min: 0,
    Max: 1
};

function doMinimax(boardInfo, myMarker) {
    return doMinimaxImpl(boardInfo, myMarker, Operation.Max).cell;
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
    if (util.checkWin(boardInfo.cells, myMarker)) {
        return 10;
    } else if (util.checkWin(boardInfo.cells, util.getOppositeMarker(myMarker))) {
        return -10;
    } else {
        return 0;
    }
}

/**
 * Execute an AI turn.
 * Returns the cell {x, y} of the move, or null if not finished moving yet.
 */
function getMove(boardInfo, myMarker) {
    // return getRandomOpenCell(boardInfo);
    return doMinimax(boardInfo, myMarker);
}

module.exports = {
    getMove: getMove,
    generateMoves: generateMoves,
    evaluateScore: evaluateScore,
};
