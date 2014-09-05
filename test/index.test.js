var expect = require('chai').expect,
    util = require('./../lib/util'),
    AiPlayer = require('./../lib/ai_player');

var COL_COUNT = 3;
var ROW_COUNT = 3;

var Marker = util.Marker;

function createBoardInfo() {
    return {
        colCount: COL_COUNT,
        rowCount: ROW_COUNT,
        cells: util.createBoard(COL_COUNT, ROW_COUNT)
    };
}

describe('board utilities', function() {
    it('should properly generate move list (empty board)', function(done) {
        var boardInfo = createBoardInfo();
        var moveList = AiPlayer.generateMoves(boardInfo);
        expect(moveList.length).to.equal(COL_COUNT * ROW_COUNT);
        done();
    });

    it('should properly generate move list (partially filled board)', function(done) {
        var boardInfo = createBoardInfo();
        boardInfo.cells[1][1] = Marker.O;
        var moveList = AiPlayer.generateMoves(boardInfo);
        expect(moveList.length).to.equal(COL_COUNT * ROW_COUNT - 1);
        done();
    });

    it('should properly generate move list (filled board)', function(done) {
        var boardInfo = createBoardInfo();
        for (var x = 0; x < COL_COUNT; x++) {
            for (var y = 0; y < ROW_COUNT; y++) {
                boardInfo.cells[x][y] = Marker.O;
            }
        }
        var moveList = AiPlayer.generateMoves(boardInfo);
        expect(moveList.length).to.equal(0);
        done();
    });

    it('should properly generate move list (already won board - O)', function(done) {
        var boardInfo = createBoardInfo();

        boardInfo.cells[0][0] = Marker.O;
        boardInfo.cells[1][0] = Marker.O;
        boardInfo.cells[2][0] = Marker.O;

        var moveList = AiPlayer.generateMoves(boardInfo);
        expect(moveList.length).to.equal(0);
        done();
    });

    it('should properly generate move list (already won board - X)', function(done) {
        var boardInfo = createBoardInfo();

        boardInfo.cells[0][0] = Marker.X;
        boardInfo.cells[1][0] = Marker.X;
        boardInfo.cells[2][0] = Marker.X;

        var moveList = AiPlayer.generateMoves(boardInfo);
        expect(moveList.length).to.equal(0);
        done();
    });
});

describe('minimax evaluation function', function() {
    it('should properly calculate a score (empty board)', function(done) {
        var boardInfo = createBoardInfo();

        expect(AiPlayer.evaluateScore(boardInfo, Marker.O)).to.equal(0);
        done();
    });

    it('should properly calculate a score (winning board)', function(done) {
        var boardInfo = createBoardInfo();

        boardInfo.cells[0][0] = Marker.O;
        boardInfo.cells[1][0] = Marker.O;
        boardInfo.cells[2][0] = Marker.O;

        expect(AiPlayer.evaluateScore(boardInfo, Marker.O)).to.equal(10);
        done();
    });

    it('should properly calculate a score (losing board)', function(done) {
        var boardInfo = createBoardInfo();

        boardInfo.cells[0][0] = Marker.X;
        boardInfo.cells[1][0] = Marker.X;
        boardInfo.cells[2][0] = Marker.X;

        expect(AiPlayer.evaluateScore(boardInfo, Marker.O)).to.equal(-10);
        done();
    });
});
