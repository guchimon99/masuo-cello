(function(global){

    // reversi
    var Game = global.Game,
        Bot = global.Bot

    var db = firebase.database()

    Vue.component("splash", {
        template: "#splash-template",
        props: ["is-shown"],
        computed: {
            rootClass: function(){
                return {
                    "splash-hidden" : !this.isShown
                }
            }
        }
    })

    Vue.component("board", {
        template: "#board-template",
        props: ["board"],
        methods: {
            selectCell: function(index, event) {
                this.$emit('select-cell', index)
            }
        }
    })

    Vue.component("game-status", {
        template: "#game-status-template",
        props: ["status"],
    })

    Vue.component("player-status", {
        template: "#player-status-template",
        props: ["player", "turn"],
        computed: {
            lumpClass: function(){
                return {
                    "playerStatus_lump-active" : this.turn == this.player.color
                }
            }
        }
    })

    Vue.component("face-background", {
        template: "#face-background-template",
        data: function(){
            return {
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0
            }
        },
        computed: {
            faceStyle : function(){
                var transform = ""
                transform += "scale(" + this.scale + ")"
                transform += "rotate(" + this.rotate + "deg)"
                return {
                    top: this.y + "%",
                    left: this.x + "%",
                    transform: transform
                }
            }
        },
        methods: {
            updateTransform: function(duration){
                this.x = Math.floor(Math.random() * 120 - 20)
                this.y = Math.floor(Math.random() * 10 + 70)
                this.scale = Math.floor(Math.random() * 2 + 0.5)
                this.rotate = Math.floor(Math.random() * 360)
                this.transitionDuration = duration
            },
            loop: function(){
                var duration = Math.random() * 10 * 1000
                this.updateTransform(duration)
                setTimeout(() => { this.loop() }, duration)
            }
        },
        created: function(){
            this.loop()
        }
    })

    var StartScene = Vue.component("start-scene", {
        template: "#start-scene-template"
    })

    var PlayScene = Vue.component("play-scene", {
        template: "#play-scene-template",
        data: function(){
            return {
                bot: null,
                game: null,
                menuShown: false,
            }
        },
        computed: {
            board: function(){
                return this.game ? this.game.board : null
            },
            status: function() {

                var board = this.game.board,
                    player1 = this.game.players[0],
                    player2 = this.game.players[1],
                    score1 = board.getCountOfCell(player1.color),
                    score2 = board.getCountOfCell(player2.color),
                    winPlayer = score1 == score2 ? null : (score1 > score2 ? player1 : player2)

                return {
                    turn: this.game.turn,
                    canContinue: this.game.canContinue(),
                    winPlayer: winPlayer,
                    players: [
                        {
                            name: player1.name,
                            color: player1.color,
                            score: score1,
                        },{
                            name: player2.name,
                            color: player2.color,
                            score: score2,
                        }
                    ],
                }
            },
            resultShown: function() {
                return this.game && !this.game.canContinue()
            }
        },
        methods: {
            resetGame: function() {
                this.menuShown = false
                this.startGame()
            },
            selectCell: function(index) {

                var color = this.game.players[0].color,
                    turn = this.game.turn,
                    board = this.game.board

                if ( turn == color && board.isPuttable(index, color) ) {
                    this.game.put(index, color)
                    this.game.toggleTurn()
                    this.doBotTurn()
                }
            },
            doBotTurn: function(){
                var color = this.game.players[1].color,
                    board = this.board,
                    put = this.bot.getPut(board, color)

                setTimeout(() => {
                    if (put != null) {
                        this.game.put(put, color)
                        this.game.toggleTurn()
                    }

                    if (this.game.canContinue()) {
                        if (put == null) this.game.passTurn()
                        this.doPlayerTurn()
                    }
                }, 300)
            },
            doPlayerTurn: function() {
                var color = this.game.players[0].color
                if (this.game.canContinue() && this.game.board.getPuttables(color).length < 1) {
                    this.game.passTurn()
                    this.doBotTurn()
                }
            },
            startGame :function() {
                this.bot = new Bot()
                this.game = new Game({ players: ["あなた", "ますお"] })

                if (this.game.turn == this.game.players[1].color) {
                    setTimeout(() => this.doBotTurn(), 500)
                }
            }
        },
        created: function(){
            this.startGame()
        }
    })

    var router = new VueRouter({
        routes: [
            { path: "/", component: StartScene },
            { path: "/play", component: PlayScene },
        ]
    })

    var app = new Vue({
        router: router,
        data: {
            isFontLoading: true
        },
        computed: {
            isLoading: function(){
                return this.isFontLoading
            },
        },
        created: function () {
            this.$router.replace("/")
            WebFont.load({
                custom: {
                    families: ["CP_Revenge"],
                    urls: ["/assets/css/style.css"]
                },
                active: () => {
                    this.isFontLoading = false
                }
            })
        }
    }).$mount("#app")
})(window)
