'use strict';

var util = require('./util'),
    assert = require('assert');

var AiStrategy = {
    RandomOpenCell: 0,
    Minimax: 1,
    AlphaBetaPruning: 2
};

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
