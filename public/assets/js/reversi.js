(function(global){

    var EMPTY = 0,
    BLACK = 1,
    WHITE = 2

    var Game = function Game(o) {

        o = o || {}

        var cells = new Array(64).fill(0)
        cells[27] = WHITE
        cells[28] = BLACK
        cells[35] = BLACK
        cells[36] = WHITE

        this.board = new Board({cells: cells})
        this.players = []
        this.turn = BLACK
        this.countOfPass = 0

        if (o.players) this.setPlayers(o.players)
    }

    Game.EMPTY = EMPTY
    Game.BLACK = BLACK
    Game.WHITE = WHITE

    Game.prototype = {
        setPlayers: function(names){
            var r = Math.random() > 0.5
            this.players = [
                new Player(names[0], r > 0.5 ? BLACK : WHITE),
                new Player(names[1], r > 0.5 ? WHITE : BLACK)
            ]
        },
        put: function(index, color){
            this.board = this.board.put(index, color)
        },
        toggleTurn: function(){
            this.countOfPass = 0
            this.turn = this.turn != BLACK ? BLACK : WHITE
        },
        passTurn: function() {
            this.countOfPass += 1
            this.toggleTurn()
        },
        canContinue: function () {
            return this.countOfPass < 2 && this.board.getCountOfCell(EMPTY) > 1
        }
    }

    var Board = function Board (o) {
        o = o || {}
        this.cells = o.cells ? [].concat(o.cells) : new Array(64).fill(null).map(function(){ return 0 })
    }

    Board._affectMaps = new Array(64).fill(null).map((_, i) => {
        return [{
            conditions: (c) => (c >= 8 && c % 8 != 0),
            increment: -9
        }, {
            conditions: (c) => (c >= 8),
            increment: -8
        }, {
            conditions: (c) => (c >= 8 && c % 8 != 7),
            increment: -7
        }, {
            conditions: (c) => (c % 8 != 0),
            increment: -1
        }, {
            conditions: (c) => (c % 8 != 7),
            increment: +1
        }, {
            conditions: (c) => (c <= 55 && c % 8 != 0),
            increment: 7
        }, {
            conditions: (c) => (c <= 55),
            increment: 8
        }, {
            conditions: (c) => (c <= 55 && c % 8 != 7),
            increment: 9
        }].map((e) => {
            var c = i, l = []
            while(e.conditions(c)) {
                c += e.increment
                l.push(c)
            }

            return l
        })
    })

    Board.prototype = {
        clone: function(){
            return new Board(this)
        },
        reverse: function(){
            var board = this.clone()

            board.cells = board.cells.map((cell) => cell == EMPTY ? EMPTY : (cell != BLACK ? BLACK : WHITE))

            return board
        },
        put: function(index, color) {
            var board = this.clone()

            board.getAffectables(index, color).forEach((index) => board.cells[index] = color)
            board.cells[index] = color

            return board
        },
        isPuttable: function(index, color){
            return this.cells[index] == EMPTY && this.getAffectables(index, color).length > 0
        },
        getCountOfCell: function(state) {
            return this.cells.reduce((count, cell) => count + (cell == state ? 1 : 0), 0)
        },
        getPuttables: function(color) {
            var puttables = []
            this.cells.forEach((cell, index) => {
                if (cell == EMPTY && this.getAffectables(index, color).length > 0) {
                    puttables.push(index)
                }
            })
        return puttables
        },
        getAffectables: function(index, color){
            var affectables = []

            Board._affectMaps[index].forEach(line => {
                var indexes = []
                line.some((index) => {
                    var cell = this.cells[index]
                    if (cell == 0) {
                        indexes = []
                        return true
                    } else if (cell == color) {
                        affectables = affectables.concat(indexes)
                        return true
                    } else {
                        indexes.push(index)
                    }
                })
            })

            return affectables
        },
        getCornerLines: function(index, color) {
            var c = (color == BLACK) ? this.cells : this.reverse().cells

            return [
                ("" +  c[0] +  c[1] +  c[3]),
                ("" +  c[0] +  c[9] + c[18]),
                ("" +  c[0] +  c[8] + c[16]),
                ("" +  c[7] +  c[6] +  c[5]),
                ("" +  c[7] + c[14] + c[21]),
                ("" +  c[7] + c[15] + c[23]),
                ("" + c[56] + c[57] + c[58]),
                ("" + c[56] + c[49] + c[42]),
                ("" + c[56] + c[48] + c[40]),
                ("" + c[63] + c[62] + c[61]),
                ("" + c[63] + c[54] + c[45]),
                ("" + c[63] + c[55] + c[47]),
            ]
        }
    }

    var Player = function Player (name, color) {
        this.name = name
        this.color = color
    }

    var Bot = function Bot() {
        this.k = 1
        this.cornerLineScores = Bot.cornerLineScores[0]
    }

    Bot.cornerLineScores = [{
        "000" : 0, "001" : 1, "002" : -1,
        "010" : -1, "011" : 1, "012" : -1,
        "020" : 1, "021" : 1, "022" : -1,

        "100" : 1, "101" : -1, "102" : 1,
        "110" : -1, "111" : 1, "112" : -1,
        "120" : 1, "121" : 1, "122" : -1,

        "200" : 1, "201" : 1, "202" : 1,
        "210" : -1, "211" : 1, "212" : 1,
        "220" : 1, "221" : 1, "222" : -1
    }]

    Bot.prototype = {
        getPut: function(board, color) {

            if (board.getPuttables(color).length < 1) return null

            return board.getPuttables(color)

            .map(index => {
                return {
                    index: index,
                    score: this.alphaBetaEval(board, 6, this.color)
                }
            })

            .sort((a, b) => a.score > b.score)[0].index
        },
        evalBoard: function(board, color) {

            var o = color,
                p = color == BLACK ? WHITE : BLACK,
                a = board.getPuttables(o).length - board.getPuttables(p).length,
                b = this.evalCorners(board, o) - this.evalCorners(board, p),
                k = this.k

            return a + b * k
        },
        evalCorners: function(board, color) {
            return board.getCornerLines(color).reduce((score, cornerLine) => score + this.cornerLineScores[cornerLine], 0)
        },
        alphaBetaEval: function(board, depth, color) {

            if (depth <= 0) return this.evalBoard(board)

            var indexes = board.getPuttables(color)

            if(indexes.length < 1) return this.alphaBetaEval(board, depth - 1, color == BLACK ? WHITE : BLACK)

            board = board.getPuttables(color).map((index) => {
                b = board.put(index, color)
                return {
                    board: b,
                    score: this.evalBoard(b)
                }
            }).sort((a,b) => a.score > b.score)[0].board

            return this.alphaBetaEval(board, depth - 1, color == BLACK ? WHITE : BLACK)
        },
    }

    global.Game = Game
    global.Bot = Bot

})(window)
