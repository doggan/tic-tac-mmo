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
    for (var y = 0; y < colCount; y++) {
        for (var x = 0; x < rowCount; x++) {
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

    getOppositeMarker: function(marker) {
        return (marker === Marker.X) ? Marker.O : Marker.X;
    },

    canPlaceMarker: function(x, y, cells) {
        return (cells[x][y] === null);
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
