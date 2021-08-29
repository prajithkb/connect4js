var $ = require('jquery');
require('jquery-ui-bundle');
import { Connect4, Player, PlayerTypes } from './game'

let actionInProgress = 0;
let timeTaken = 0;

interface UIInputs {
    levelId: number,
}

export class UI {
    constructor(
        public inputs: UIInputs,
        public connect4: Connect4

    ) {
        this.inputs = inputs;
        this.connect4 = connect4;
        connect4.onMoveEnd(this.onMoveEnd, this);
        connect4.onMoveStart(this.onMoveStart, this);
        this.subscribeForPlayerMove(connect4);
        this.gameStartDialog();
    }

    startTimer() {
        const startTime = Date.now();
        setInterval(() => {
            timeTaken = (Date.now() - startTime) / 1000;
            $("#moves-and-time").find("#elapsed-time").text(this.secondsToHms(timeTaken));
        }, 1000);
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
            connect4.makeMove(PlayerTypes.First, c);
        });
    }

    gameStartDialog() {
        let ui = this;
        $("#game-start-dialog").dialog({
            dialogClass: "no-close",
            buttons: [
                {
                    text: "You start",
                    click: function () {
                        $(this).dialog("close");
                        ui.startTimer();
                    }
                },
                {
                    text: "Computer starts",
                    click: function () {
                        $(this).dialog("close");
                        ui.nextMove(PlayerTypes.Second);
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
                    case PlayerTypes.First: {
                        message = "You Won!";
                        break;
                    };
                    case PlayerTypes.Second: {
                        message = "You Lost!";
                        break;
                    };
                    case PlayerTypes.None: {
                        message = "It's a tie!";
                        break;
                    }
                }
                console.log($(v).find("#result").text(message));
                console.log($(v).find("#time-taken").text(engine.secondsToHms(timeTaken)));
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
        $(function () {
            // Animate the coordinates
            coords.map(([row, col]) => [5 - row, col])
                .forEach(([row, col]) => {
                    console.log(`Animating ${row}, ${col}`);
                    $(`#gameBoard #col${col} #col${col}x${row}`)
                        .fadeOut(200)
                        .fadeIn(200)
                        .fadeOut(200)
                        .fadeIn(200)
                        .fadeOut(200)
                        .fadeIn('slow', () => engine.gameOverDialog(winner));
                });
        });
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
        console.log(`OnMoveEnd player: ${player}, name: ${col}, side: ${row}`)
        let engine: UI = this;
        $("#gameBoard").removeClass("loading");
        $("#num_of_moves").val(engine.render());
        row = 5 - row;
        $("#gameBoard #col" + col + " .next-ball").addClass("animation-in-progress player" + player);
        $("#gameBoard #col" + col + " .next-ball").animate({
            top: "+=" + (56 * (row + 1) - 1)
        }, {
            duration: row * 150 + 500,
            easing: "easeOutBounce",
            complete: function () {
                $("#moves-and-time").find("#moves").text(String(engine.connect4.numberOfPieces));
                $("#gameBoard #col" + col + " div:nth-child(" + (row + 2) + ")").html("<span class='ball player" + player + "'></span>");
                $("#gameBoard #col" + col + " .next-ball").css("top", "");
                $("#gameBoard .animation-in-progress").removeClass("animation-in-progress");
                if (player === PlayerTypes.First) {
                    engine.nextMove(PlayerTypes.Second);
                } else {
                    console.log("waiting for your move");
                    $("#game-status").find("#status").text("Waiting for your move...");
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
        if (!this.connect4.gameOver && player === PlayerTypes.Second) {
            $("#game-status").find("#status").text("Computer making a move...");
            $("#gameBoard").addClass("loading");
            let weight = 0;
            switch (this.inputs.levelId) {
                case 0:
                case 1:
                    /** @type {number} */
                    weight = 50;
                    break;
                case 2:
                case 3:
                    /** @type {number} */
                    weight = 30;
                    break;
                case 4:
                case 5:
                    /** @type {number} */
                    weight = 10;
                    break;
                case 6:
                case 7:
                    /** @type {number} */
                    weight = 5;
                default:
                    break;
            }
            // We decide to do smart move based on the weight
            // The lower the weight, the higher the chance of smart move
            if (Math.floor(Math.random() * 99 + 1) > weight) {
                this.connect4.smartMove(player);
                return;
            }
            // We do a random Move
            this.connect4.randomMove(player);
        } else {
            console.log("Game over!");
        }
    }

    render() {
        /** @type {number} */
        let renderedBNode = Math.floor(this.connect4.numberOfPieces / 2);
        if (this.inputs.levelId % 2 === 0) {
            /** @type {number} */
            renderedBNode = Math.ceil(this.connect4.numberOfPieces / 2);
        }
        return renderedBNode;
    }
}
