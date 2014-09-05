'use strict';

var Marker = {
    X: 'X',
    O: 'O'
};

function getScore(cells, marker, colCount) {
    var cnt = 0;
    var totalScore = 0;
    for (var i = 0; i < cells.length; i++) {
        var cell = cells[i];
        if (cell.value === marker) {
            var cellIndex = cell.y * colCount + cell.x;
            totalScore += (1 << cellIndex);
        }
    }

    return totalScore;
}

module.exports = {
    Marker: Marker,

    getOppositeMarker: function(marker) {
        return (marker === Marker.X) ? Marker.O : Marker.X;
    },

    canPlaceMarker: function(x, y, cells) {
        for (var i = 0; i < cells.length; i++) {
            var cell = cells[i];

            // Marker already exists at this position.
            if (cell.x === x && cell.y === y) {
                return false;
            }
        }

        return true;
    },

    checkWin: function(cells, marker, colCount) {
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
        var score = getScore(cells, marker, colCount);
        for (var i = 0; i < winScores.length; i++) {
            if ((score & winScores [i]) === winScores [i]) {
                return true;
            }
        }

        return false;
    }
};
