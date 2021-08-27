'use strict';
/** @type {number} */
var _0 = 1;
$(document).ready(function () {
    if (typeof levelId === "undefined") {
        return;
    }
    if (!window.Worker) {
        _3();
        return;
    }
    /** @type {number} */
    var aiLevel = Math.max(6, Math.floor(1 + levelId / 4) + 5);
    new Connect4({
        ai: aiLevel
    }, function (self) {
        /**
         * @param {number} i
         * @param {string} name
         * @param {number} side
         * @return {undefined}
         */
        function animate(i, name, side) {
            $("#gameBoard").removeClass("loading");
            $("#num_of_moves").val(render());
            /** @type {number} */
            side = 5 - side;
            $("#gameBoard #col" + name + " .next-ball").addClass("animation-in-progress player" + i);
            $("#gameBoard #col" + name + " .next-ball").animate({
                top: "+=" + (56 * (side + 1) - 1)
            }, {
                duration: side * 150 + 500,
                easing: "easeOutBounce",
                complete: function () {
                    $("#gameBoard #col" + name + " div:nth-child(" + (side + 2) + ")").html("<span class='ball player" + i + "'></span>");
                    $("#gameBoard #col" + name + " .next-ball").css("top", "");
                    $("#gameBoard .animation-in-progress").removeClass("animation-in-progress");
                    if (i === 0) {
                        next(i);
                    } else {
                        $("#gameBoard #col" + name + " .next-ball").removeClass("player" + i);
                    }
                    /** @type {number} */
                    _0 = 0;
                }
            });
        }
        /**
         * @param {number} _
         * @return {undefined}
         */
        function next(_) {
            /** @type {number} */
            var move = _ ^ 1;
            if (!self.gameOver && move === 1) {
                $("#gameBoard").addClass("loading");
                /** @type {number} */
                var r = 0;
                switch (levelId) {
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
                    self.autoMove(move);
                    return;
                }
                /** @type {number} */
                var col = -1;
                /** @type {!Array} */
                var items = [0, 1, 2, 3, 4, 5, 6];
                items.sort(function () {
                    return 0.5 - Math.random();
                });
                /** @type {number} */
                var i = 0;
                for (; i < items.length; i++) {
                    if (self.board[items[i]][5] === -1) {
                        col = items[i];
                        self.makeMove(move, col);
                        break;
                    }
                }
                if (col === -1) {
                    self.autoMove(move);
                }
            }
        }
        /**
         * @return {undefined}
         */
        function tryAgain_Hammer() {
            if (_0) {
                setTimeout(function () {
                    tryAgain_Hammer();
                }, 500);
                return;
            }
            init();
        }
        /**
         * @return {undefined}
         */
        function init() {
            $("#response").submit(function () {
                $("<input />").attr("type", "hidden").attr("name", "board").attr("value", JSON.stringify(self.board)).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "winCoords").attr("value", JSON.stringify(self.winningCoords)).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "win").attr("value", self.winner === 0).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "moves").attr("value", render()).appendTo("#response");
                return true;
            });
            $("#response").submit();
        }
        /**
         * @return {?}
         */
        function render() {
            /** @type {number} */
            var renderedBNode = Math.floor(self.numberOfPieces / 2);
            if (levelId % 2 === 0) {
                /** @type {number} */
                renderedBNode = Math.ceil(self.numberOfPieces / 2);
            }
            return renderedBNode;
        }
        /**
         * @param {!NodeList} b
         * @param {!NodeList} pn
         * @return {undefined}
         */
        function visit(b, pn) {
            /** @type {number} */
            var i = 0;
            for (; i < b.length; i++) {
                /** @type {number} */
                var j = 0;
                for (; j < b[i].length; j++) {
                    if (b[i][j] !== -1) {
                        /** @type {number} */
                        r = 5 - j;
                        $("#gameBoard #col" + i + " div:nth-child(" + (r + 2) + ")").html("<span class='ball player" + b[i][j] + "'></span>");
                        /** @type {number} */
                        var propI = 0;
                        for (; propI < pn.length; propI++) {
                            if (pn[propI][0] === i && pn[propI][1] === j) {
                                $("#gameBoard #col" + i + " div:nth-child(" + (r + 2) + ")").children(":first").addClass("winnerball");
                            }
                        }
                    }
                }
            }
        }
        self.subscribe("moveend", animate);
        if (board !== null) {
            /** @type {number} */
            _0 = 1;
            visit(board, winCoords);
            return;
        }
        $(".column").on("click touchend", function (event) {
            event.stopPropagation();
            event.preventDefault();
            if (_0 || event.detail && event.detail !== 1) {
                return;
            }
            /** @type {number} */
            _0 = 1;
            c = $(this).attr("id").slice(-1);
            if ($(this).find("span").length > 5) {
                $(this).find("span").fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100).fadeOut(100).fadeIn(100);
                /** @type {number} */
                _0 = 0;
                return;
            }
            self.makeMove(0, c);
        });
        self.subscribe("gameend", tryAgain_Hammer);
        if (levelId % 2 > 0) {
            /** @type {number} */
            _0 = 1;
            $("#gameBoard").addClass("loading");
            self.autoMove(1);
        }
        $(".giveup").click(function () {
            $("#response").submit(function () {
                $("<input />").attr("type", "hidden").attr("name", "board").attr("value", JSON.stringify(self.board)).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "winCoords").attr("value", JSON.stringify(self.winningCoords)).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "win").attr("value", false).appendTo("#response");
                $("<input />").attr("type", "hidden").attr("name", "moves").attr("value", render()).appendTo("#response");
                return true;
            });
            $("#response").submit();
        });
        /** @type {number} */
        _0 = 0;
    });
});
/**
 * @return {undefined}
 */
function _3() {
    $("#noSupport").show();
}
/**
 * @param {?} options
 * @return {?}
 */
$.fn.pulse = function (options) {
    options = $.extend({
        times: 3,
        duration: 1000
    }, options);
    /**
     * @param {?} delay
     * @return {undefined}
     */
    var callback = function (delay) {
        $(this).animate({
            opacity: 0
        }, options.duration, function () {
            $(this).animate({
                opacity: 1
            }, options.duration, delay);
        });
    };
    return this.each(function () {
        /** @type {number} */
        var i = +options.times;
        var $sections = this;
        /**
         * @return {undefined}
         */
        var step = function () {
            if (--i) {
                callback.call($sections, step);
            }
        };
        callback.call(this, step);
    });
};
