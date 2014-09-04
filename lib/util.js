'use strict';

var Marker = {
    X: 'X',
    O: 'O'
};

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
    }
};
