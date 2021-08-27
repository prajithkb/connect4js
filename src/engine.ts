var $ = require('jquery');
require('jquery-ui-bundle');
import { Connect4, OnMoveEnd } from './game'

let _0 = 0;

interface EngineInputs {
    levelId: number,
}

export class Engine {
    constructor(
        public inputs: EngineInputs,
        public connect4: Connect4

    ) {
        this.inputs = inputs;
        this.connect4 = connect4;
        connect4.onMoveEnd(this.animate, this);
    }
    onMoveEnd(i: number, name: string, side: number) {
        this.animate(i, name, side)
    }

    /// Copied from the internet. 
    /// Animates the movement of the drop of the ball
    animate(player: number, col: string, row: number) {
        console.log(`Animating player: ${player}, name: ${col}, side: ${row}`)
        let engine: Engine = this;
        $("#gameBoard").removeClass("loading");
        $("#num_of_moves").val(engine.render());
        /** @type {number} */
        row = 5 - row;
        $("#gameBoard #col" + col + " .next-ball").addClass("animation-in-progress player" + player);
        $("#gameBoard #col" + col + " .next-ball").animate({
            top: "+=" + (56 * (row + 1) - 1)
        }, {
            duration: row * 150 + 500,
            easing: "easeOutBounce",
            complete: function () {
                $("#gameBoard #col" + col + " div:nth-child(" + (row + 2) + ")").html("<span class='ball player" + player + "'></span>");
                $("#gameBoard #col" + col + " .next-ball").css("top", "");
                $("#gameBoard .animation-in-progress").removeClass("animation-in-progress");
                if (player === 0) {
                    engine.next(player);
                } else {
                    $("#gameBoard #col" + col + " .next-ball").removeClass("player" + player);
                }
                /** @type {number} */
                _0 = 0;
            }
        });
    }

    /// Makes the next move
    next(i: number) {
        /** @type {number} */
        let move = i ^ 1;
        if (!this.connect4.gameOver && move === 1) {
            $("#gameBoard").addClass("loading");
            /** @type {number} */
            let r = 0;
            switch (this.inputs.levelId) {
                case 0:
                case 1:
                    /** @type {number} */
                    r = 50;
                    break;
                case 2:
                case 3:
                    /** @type {number} */
                    r = 30;
                    break;
                case 4:
                case 5:
                    /** @type {number} */
                    r = 10;
                    break;
                case 6:
                case 7:
                    /** @type {number} */
                    r = 5;
                default:
                    break;
            }
            if (Math.floor(Math.random() * 99 + 1) > r) {
                this.connect4.autoMove(move);
                return;
            }
            /** @type {number} */
            let col = -1;
            /** @type {!Array} */
            let items = [0, 1, 2, 3, 4, 5, 6];
            items.sort(function () {
                return 0.5 - Math.random();
            });
            /** @type {number} */
            let i = 0;
            for (; i < items.length; i++) {
                if (this.connect4.board[items[i]][5] === -1) {
                    col = items[i];
                    this.connect4.makeMove(move, col);
                    break;
                }
            }
            if (col === -1) {
                this.connect4.autoMove(move);
            }
        }
    }

    /**
     * @return {?}
     */
    render() {
        /** @type {number} */
        let renderedBNode = Math.floor(this.connect4.numberOfPieces / 2);
        if (this.inputs.levelId % 2 === 0) {
            /** @type {number} */
            renderedBNode = Math.ceil(this.connect4.numberOfPieces / 2);
        }
        return renderedBNode;
    }
    /**
     * @param {!NodeList} b
     * @param {!NodeList} pn
     * @return {undefined}
     */
    visit(b: number[][], pn: any[]) {
        /** @type {number} */
        let i = 0;
        for (; i < b.length; i++) {
            /** @type {number} */
            let j = 0;
            for (; j < b[i].length; j++) {
                if (b[i][j] !== -1) {
                    /** @type {number} */
                    let r = 5 - j;
                    $("#gameBoard #col" + i + " div:nth-child(" + (r + 2) + ")").html("<span class='ball player" + b[i][j] + "'></span>");
                    /** @type {number} */
                    let propI = 0;
                    for (; propI < pn.length; propI++) {
                        if (pn[propI][0] === i && pn[propI][1] === j) {
                            $("#gameBoard #col" + i + " div:nth-child(" + (r + 2) + ")").children(":first").addClass("winnerball");
                        }
                    }
                }
            }
        }
    }


}
