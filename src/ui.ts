var $ = require('jquery');
require('jquery-ui-bundle');
import { Connect4, Player, playerToString, PlayerTypes } from './game'

let actionInProgress = 0;
let timeTaken = 0;

interface UIInputs {
    level: number,
}

export class UI {
    private predefinedMoves: Array<any>
    private id: string
    constructor(
        public inputs: UIInputs,
        public connect4: Connect4,
    ) {
        this.inputs = inputs;
        this.connect4 = connect4;
        this.predefinedMoves = [];
        this.id = Date.now().toString();
        connect4.onMoveEnd(this.onMoveEnd, this);
        connect4.onMoveStart(this.onMoveStart, this);
        this.subscribeForPlayerMove(connect4);
        this.gameStartDialog();
        $("#restart-button").click(() => {
            location.reload();
        });
    }

    startTimer() {
        const startTime = Date.now();
        let connect4 = this.connect4;
        let timer = setInterval(() => {
            timeTaken = (Date.now() - startTime) / 1000;
            $("#moves-and-time").find("#elapsed-time").text(this.secondsToHms(timeTaken));
            if (connect4.gameOver) {
                clearTimeout(timer);
            }
        }, 1000);
        var dots = 0;
        let dots_handle = setInterval(() => {
            if (dots < 3) {
                $('#dots').append('<b> .</b>');
                dots++;
            } else {
                $('#dots').html('');
                dots = 0;
            }
            if (connect4.gameOver) {
                clearTimeout(dots_handle);
            }
        }, 333)
    }

    secondsToHms(d: number): string {
        var h = Math.floor(d / 3600);
        var m = Math.floor(d % 3600 / 60);
        var s = Math.floor(d % 3600 % 60);

        var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
        var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
        var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
        return hDisplay + mDisplay + sDisplay;
    }

    /**
     * Subscribes for a player click on a column.
     * WHen a player clicks on the column, this method listens for the click and makes the move
     * @param connect4 
     */
    subscribeForPlayerMove(connect4: Connect4) {
        $(".column").on("click touchend", function (event: any) {
            event.stopPropagation();
            event.preventDefault();
            if (actionInProgress || event.detail && event.detail !== 1) {
                return;
            }
            actionInProgress = 1;
            let c: number = $(this).attr("id").slice(-1);
            if ($(this).find("span").length > 5) {
                $(this).find("span")
                    .fadeOut(100)
                    .fadeIn(100)
                    .fadeOut(100)
                    .fadeIn(100)
                    .fadeOut(100)
                    .fadeIn(100);
                actionInProgress = 0;
                return;
            }
            setTimeout(() => connect4.makeMove(PlayerTypes.Human, c), 10);
        });
    }

    gameStartDialog() {
        let ui = this;
        $("#game-start-dialog").dialog({
            dialogClass: "no-close",
            width: "auto",
            height: "auto",
            buttons: [
                {
                    text: "Start",
                    click: function () {
                        $(this).dialog("close");
                        let level = parseInt($("#game-levels").val());
                        let player = parseInt($("#chosen-player").val());
                        // initialize moves
                        let movesJson = $.trim($("#moves-textarea").val());
                        if (movesJson) {
                            let moves: Array<any> = JSON.parse(movesJson);
                            ui.predefinedMoves = moves.filter(m => m.player === PlayerTypes.Human).reverse();
                        }
                        $.ajax({
                            url: 'http://localhost:8080/log',
                            type: 'post',
                            data: JSON.stringify({
                                message: JSON.stringify({
                                    id: ui.id,
                                    firstPlayer: playerToString(player)
                                })
                            }),
                            contentType: "application/json; charset=utf-8",
                            dataType: 'json',
                            success: (data: string) => {
                            }
                        });
                        if (player === PlayerTypes.Computer) {
                            console.log("Computer will make the first move");
                            $("#game-status").find("#status").text("Computer making a move");
                            setTimeout(() => ui.connect4.smartMove(PlayerTypes.Computer), 10);
                        } else {
                            if (ui.predefinedMoves.length > 0) {
                                $("#game-status").find("#status").text("Using predefined  move");
                                let nextMove = ui.predefinedMoves.pop();
                                console.log(`Found predefined move ${JSON.stringify(nextMove)}`);
                                try {
                                    setTimeout(() => ui.connect4.makeMove(PlayerTypes.Human, nextMove.move.col), 10);
                                } catch (e) {
                                    console.log("Broken! - clearing predefined moves");
                                    ui.predefinedMoves.length = 0;
                                    $("#game-status").find("#status").text("Waiting for your move");;
                                }
                            } else {
                                $("#game-status").find("#status").text("Waiting for your move");
                            }
                        }
                        $("#level").text(level);
                        ui.inputs.level = level;
                        ui.startTimer();
                    }
                }
            ],
            classes: {
                "ui-dialog": "ui-corner-all",
                "ui-dialog-titlebar": "ui-corner-all",
            },
            modal: true,
            show: { effect: "bounce", duration: 1000 },
        })
    }

    gameOverDialog(player: Player) {
        let engine = this;

        $("#game-over-dialog").dialog({
            create: function (event: any, ui: any) {
                let v = event.target;
                let message = "";
                switch (player) {
                    case PlayerTypes.Human: {
                        message = "You Won!";
                        break;
                    };
                    case PlayerTypes.Computer: {
                        message = "You Lost!";
                        break;
                    };
                    case PlayerTypes.None: {
                        message = "It's a tie!";
                        break;
                    }
                }
                $(v).find("#result").text(message);
                $(v).find("#time-taken").text(engine.secondsToHms(timeTaken));
                $(v).find("#number-of-moves").text(engine.connect4.numberOfPieces);
            },
            modal: true,
            show: { effect: "bounce", duration: 1000 },
            dialogClass: "no-close",
            buttons: [
                {
                    text: "Play Again",
                    click: function () {
                        location.reload();
                    }
                },
                {
                    text: "Close",
                    click: function () {
                        location.reload();
                    }
                }
            ],
            classes: {
                "ui-dialog": "ui-corner-all",
                "ui-dialog-titlebar": "ui-corner-all",
            },
        })
    }

    gameEnd() {
        let winner = this.connect4.winner;
        let coords = this.connect4.winningCoords;
        let engine = this;
        $.ajax({
            url: '/log',
            type: 'post',
            data: JSON.stringify({
                message: JSON.stringify({
                    id: engine.id,
                    allMoves: engine.connect4.getAllMoves(),
                    winner: playerToString(winner),
                }),
            }),
            contentType: "application/json; charset=utf-8",
            dataType: 'json',
            success: (data: string) => {
            }
        });
        if (winner === PlayerTypes.None) {
            engine.gameOverDialog(PlayerTypes.None);
        } else {
            coords.map(([row, col]) => [this.connect4.rows - 1 - row, col])
                .forEach(([row, col]) => {
                    $(`#gameBoard #col${col} #col${col}x${row}`)
                        .fadeOut(200)
                        .fadeIn(200)
                        .fadeOut(200)
                        .fadeIn(200)
                        .fadeOut(200)
                        .fadeIn('slow', () => engine.gameOverDialog(winner));

                });
        }
    }

    onMoveStart(_: Player, __: string) {
        actionInProgress = 1;
    }

    /**
     * Animates the move and invokes the
     * @param player 
     * @param col 
     * @param row 
     */
    onMoveEnd(player: Player, col: string, row: number) {
        let engine: UI = this;
        $("#gameBoard").removeClass("loading");
        $("#num_of_moves").val(engine.render());
        row = this.connect4.rows - 1 - row;
        let factor = 11;
        if ($(window).width() > 1024) {
            factor = 6;
        }
        $("#gameBoard #col" + col + " .next-ball").addClass("animation-in-progress player" + player);
        $("#gameBoard #col" + col + " .next-ball").animate({
            top: "+=" + (11 * factor * (row + 1) - 1)
        }, {
            duration: row * 150 + 500,
            easing: "easeOutBounce",
            complete: function () {
                $("#moves-and-time").find("#moves").text(String(engine.connect4.numberOfPieces));
                $("#gameBoard #col" + col + " div:nth-child(" + (row + 2) + ")").html("<span class='ball player" + player + "'></span>");
                $("#gameBoard #col" + col + " .next-ball").css("top", "");
                $("#gameBoard .animation-in-progress").removeClass("animation-in-progress");
                if (player === PlayerTypes.Human) {
                    setTimeout(() => engine.nextMove(PlayerTypes.Computer), 10);
                } else {
                    $("#game-status").find("#status").text("Waiting for your move");
                    if (engine.predefinedMoves.length > 0) {
                        let nextMove = engine.predefinedMoves.pop();
                        console.log(`Found predefined move ${JSON.stringify(nextMove)}`);
                        setTimeout(() => engine.connect4.makeMove(PlayerTypes.Human, nextMove.move.col), 10);
                    }
                    $("#gameBoard #col" + col + " .next-ball").removeClass("player" + player);
                }
                actionInProgress = 0;
                if (engine.connect4.gameOver) {
                    engine.gameEnd()
                }
            }
        });
    }

    /// Makes the next move
    nextMove(player: Player) {
        if (!this.connect4.gameOver && player === PlayerTypes.Computer) {
            $("#game-status").find("#status").text("Computer making a move");
            $("#gameBoard").addClass("loading");
            let weight = 0;
            switch (this.inputs.level) {
                case 1:
                    weight = 40;
                    break;
                case 2:
                    weight = 30;
                    break;
                case 3:
                    weight = 20;
                    break;
                case 4:
                    weight = 10;
                    break;
                case 5:
                    weight = 0;
                    break;
                default:
                    break;
            }
            // We decide to do smart move based on the weight
            // The lower the weight, the higher the chance of smart move
            if (Math.floor(Math.random() * 99 + 1) > weight) {
                setTimeout(() => this.connect4.smartMove(PlayerTypes.Computer), 10);
                return;
            }
            // We do a random Move
            setTimeout(() => this.connect4.randomMove(), 10);
        } else {
            console.log("Game over!");
        }
    }

    render() {
        /** @type {number} */
        let renderedBNode = Math.floor(this.connect4.numberOfPieces / 2);
        if (this.inputs.level % 2 === 0) {
            /** @type {number} */
            renderedBNode = Math.ceil(this.connect4.numberOfPieces / 2);
        }
        return renderedBNode;
    }
}
