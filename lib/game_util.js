'use strict';

let Marker = {
    X: 'X',
    O: 'O'
};

function getScore(cells, marker) {
    let colCount = cells.length;
    let rowCount = cells[0].length;

    let cnt = 0;
    let totalScore = 0;
    for (let y = 0; y < rowCount; y++) {
        for (let x = 0; x < colCount; x++) {
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
        let cells = [];
        for (let x = 0; x < colCount; x++) {
            let col = [];
            for (let y = 0; y < rowCount; y++) {
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
        for (let x = 0; x < cells.length; x++) {
            for (let y = 0; y < cells[x].length; y++) {
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

        let winScores = [7, 56, 448, 73, 146, 292, 84, 273];

        let score = getScore(cells, marker);
        for (let i = 0; i < winScores.length; i++) {
            if ((score & winScores [i]) === winScores [i]) {
                return true;
            }
        }

        return false;
    }
};
