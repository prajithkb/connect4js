export enum GameEvent {
    MoveStart,
    MoveEnd
}

const NOT_POSSIBLE = -100000;

const DEPTH = 5;

export type OnMoveEnd = (player: Player, col: string, row: number) => void;

export type OnMoveStart = (player: Player, col: string) => void;

export type Player = number;

export enum PlayerTypes {
    None = -1,
    Human = 0,
    Computer = 1
}


interface Subscription {
    context: any,
    method: any
}

const MARKER: Map<Player, string> = new Map([
    [PlayerTypes.Computer, '0'],
    [PlayerTypes.Human, 'X'],
    [PlayerTypes.None, '_'],
]);

const NAMES: Map<Player, string> = new Map([
    [PlayerTypes.Computer, "Computer"],
    [PlayerTypes.Human, "Human"],
    [PlayerTypes.None, "None"],
]);


export function playerToString(player: PlayerTypes) {
    return NAMES.get(player);
}

export function otherPlayer(player: PlayerTypes): PlayerTypes {
    if (player == PlayerTypes.Human) {
        return PlayerTypes.Computer
    } else {
        return PlayerTypes.Human
    }
}

// Strategy used by http://pomakis.com/c4/connect_generic/c4.txt
export class WinPositionState {
    public state: Array<Array<Array<number>>>;
    public winningPositions: Map<PlayerTypes, Array<number>>;
    public stack: Array<Map<PlayerTypes, Array<number>>>;
    private rows: number;
    private cols: number;
    private numberToConnect: number;
    private numberOfWinningPositions: number;

    constructor(rows: number, cols: number, numberToConnect: number) {
        this.rows = rows;
        this.cols = cols;
        this.numberToConnect = numberToConnect;
        this.numberOfWinningPositions = this.computeNumberOfWinningPositions();
        this.initialize();
    }

    initialize() {
        this.state = [];
        // Initialize the 3D state array
        for (let row = 0; row < this.rows; row++) {
            this.state[row] = [];
            for (let col = 0; col < this.cols; col++) {
                this.state[row][col] = [];
            }
        }
        let winningPosition = 0;
        /* Fill in the horizontal win positions */
        for (let row = 0; row < this.rows; row++) {
            for (let col = 0; col < (this.cols - this.numberToConnect + 1); col++) {
                for (let pos = 0; pos < this.numberToConnect; pos++) {
                    this.state[row][col + pos].push(winningPosition);
                }
                winningPosition++;
            }

        }
        /** Fill in vertical win positions */
        for (let row = 0; row < (this.rows - this.numberToConnect + 1); row++) {
            for (let col = 0; col < this.cols; col++) {
                for (let pos = 0; pos < this.numberToConnect; pos++) {
                    this.state[row + pos][col].push(winningPosition);
                }
                winningPosition++;
            }

        }

        /** Fill in positive slope diagonal win positions */
        for (let row = 0; row < (this.rows - this.numberToConnect + 1); row++) {
            for (let col = 0; col < this.cols - this.numberToConnect; col++) {
                for (let pos = 0; pos < this.numberToConnect; pos++) {
                    this.state[row + pos][col + pos].push(winningPosition);
                }
                winningPosition++;
            }
        }

        /** Fill in negative slope diagonal win positions */
        for (let row = this.rows - 1; row >= this.numberToConnect - 1; row--) {
            for (let col = 0; col < (this.cols - this.numberToConnect + 1); col++) {
                for (let pos = 0; pos < this.numberToConnect; pos++) {
                    this.state[row - pos][col + pos].push(winningPosition);
                }
                winningPosition++;
            }
        }

        // Set the points for all positions to 1
        // Both players can win any position
        let pointsForWinningPositions = new Array(this.numberOfWinningPositions + 1);
        pointsForWinningPositions.fill(1);

        this.winningPositions = new Map([
            [PlayerTypes.Human, Object.assign([], pointsForWinningPositions)],
            [PlayerTypes.Computer, pointsForWinningPositions],
        ]);
        this.stack = [];
        this.stack.push(this.winningPositions);
    }

    printState() {
        console.log("#############");
        for (let row = 0; row < this.rows; row++) {
            let r = '';
            for (let col = 0; col < this.cols; col++) {
                r += `[${this.state[row][col]}]`;
                r += ',';
            }
            console.log(r.substring(0, r.length - 1));
        }
        console.log("#############");
    }

    occupyPosition(row: number, col: number, player: PlayerTypes) {
        let copy = Object.assign([], this.winningPositions);
        this.stack.push(this.winningPositions);
        this.winningPositions = copy;
        let winningPositions = this.state[row][col];
        for (let pos of winningPositions) {
            this.winningPositions.get(player)[pos] <<= 1;
            this.winningPositions.get(otherPlayer(player))[pos] = 0;
        }
    }

    resetPosition(row: number, col: number) {
        let prev = this.stack.pop();
        this.winningPositions = prev;
    }


    computeNumberOfWinningPositions(): number {
        let x = this.rows;
        let y = this.cols;
        let n = this.numberToConnect;
        return 4 * x * y - 3 * x * n - 3 * y * n + 3 * x + 3 * y - 4 * n + 2 * n * n + 2.
    }
}

export class Connect4 {
    public name: string;
    public gameOver: boolean;
    public rows: number;
    public board: Array<Array<Player>>;
    public winner: number;
    public winningCoords: Array<[number, number]>;
    public cols: number;
    public numberOfPieces: number;
    private subscribers: Map<GameEvent, Subscription[]>;
    private moves: Array<[PlayerTypes, [number, number]]>;
    private winPositionState: WinPositionState;
    private numberToConnect: number;
    constructor(name: string, rows: number, cols: number, numberToConnect: number = 4) {
        this.name = name
        this.subscribers = new Map();
        this.rows = rows;
        this.cols = cols;
        this.board = [];
        this.moves = [];
        this.numberOfPieces = 0;
        this.numberToConnect = numberToConnect;
        this.winPositionState = new WinPositionState(rows, cols, numberToConnect)
        this.winPositionState.printState();
        for (var i = 0; i < this.rows; i++) {
            this.board.push([]);
            for (var j = 0; j < this.cols; j++) {
                this.board[i][j] = PlayerTypes.None;
            }
        }
    }

    printBoardToConsole() {
        for (let row = 0; row < this.rows; row++) {
            let line = "["
            for (let col = 0; col < this.cols; col++) {
                line += MARKER.get(this.board[this.rows - 1 - row][col])
                if (col < (this.cols - 1)) {
                    line += "\t,";

                }
            }
            line += "]";
            console.log(line);
        }
    }

    /**
     * TODO: Makes a smart move
     * Currently it is dumb i.e. a random move 
     * @param player 
     */
    smartMove(player: PlayerTypes) {
        let bestScore = -Infinity;
        let bestCol = NOT_POSSIBLE;
        let scoresAndCols: Array<[number, number]> = [];
        let rowCols = this.getPossibleRowCols();
        for (let [row, col] of rowCols) {
            this.board[row][col] = player;
            let score = this.minimax(false, DEPTH, -Infinity, Infinity);
            scoresAndCols.push([score, col]);
            // Reset the board
            this.board[row][col] = PlayerTypes.None;
            if (score > bestScore) {
                bestScore = score;
                bestCol = col;
            }
        }
        if (bestCol === NOT_POSSIBLE) {
            console.log(`No way to win, for player :${playerToString(player)}, attempting a random move`);
            this.randomMove();
        } else {
            console.log(`Picked col ${bestCol} for ${playerToString(player)} from ${JSON.stringify(scoresAndCols.map(([score, col]) => {
                return { col: col, score: score }
            }))}`);
            this.makeMove(player, bestCol);
        }
    }

    score(cells: Array<PlayerTypes>): [number, boolean] {
        let empty = 0;
        let countHuman = 0;
        let countComputer = 0;
        let lookupTable: Map<string, [number, boolean]> = new Map(Object.entries({
            // countHuman_countComputer_empty
            "4_0_0": [-2000000, true],
            "3_0_1": [-10000, false],
            "2_0_2": [-100, false],
            "1_0_3": [-10, false],

            "0_4_0": [2000000, true],
            "0_3_1": [10000, false],
            "0_2_2": [100, false],
            "0_1_3": [10, false]
        }));
        for (let cell of cells) {
            switch (cell) {
                case PlayerTypes.Human: countHuman++;
                    break;
                case PlayerTypes.Computer: countComputer++;
                    break;
                default:
                    empty++;
                    break;
            }
        }
        let key = `${countHuman}_${countComputer}_${empty}`;
        if (lookupTable.has(key)) {
            return lookupTable.get(key)
        } else {
            return [0, false];
        }

    }

    private scoreBasedOnWinningPositions(): [number, boolean, boolean] {
        let emptySlotFound = false;
        let board = this.board;
        let totalScore = 0;
        // let totalScore = 0;
        let winningMoveFound = false;
        // let winningPositions = this.winPositionState.winningPositions.get(player);
        // Sum the total scores
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let player = board[r][c];
                if (player == PlayerTypes.None) {
                    emptySlotFound = true;
                } else {
                    let currentWinPositions = this.winPositionState.state[r][c];
                    let allWinPositionsForCurrentPlayer = this.winPositionState.winningPositions.get(player);
                    for (let winPos of currentWinPositions) {
                        if (allWinPositionsForCurrentPlayer[winPos] == 1 << this.numberToConnect) {
                            winningMoveFound = true;
                        }
                        if (player == PlayerTypes.Human) {
                            totalScore -= allWinPositionsForCurrentPlayer[winPos];
                        } else {
                            totalScore += allWinPositionsForCurrentPlayer[winPos];
                        }
                    }
                }

            }
        }

        return [totalScore, emptySlotFound, winningMoveFound]
    }

    private scoreBasedOnCurrentState(): [number, boolean, boolean] {
        let emptySlotFound = false;
        let board = this.board;
        let totalScore = 0;
        let winningMoveFound = false;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let player = board[r][c];
                if (player == PlayerTypes.None) {
                    emptySlotFound = true;
                }
                // horizontal
                if (c + 3 < this.cols) {
                    let [score, won] = this.score([board[r][c], board[r][c + 1], board[r][c + 2], board[r][c + 3]]);
                    totalScore += score;
                    if (!winningMoveFound) {
                        winningMoveFound = won;
                    }

                }
                // vertical
                if (r + 3 < this.rows) {
                    let [score, won] = this.score([board[r][c], board[r + 1][c], board[r + 2][c], board[r + 3][c]]);
                    totalScore += score;
                    if (!winningMoveFound) {
                        winningMoveFound = won
                    }
                    // positive slope diagonal
                    if (c + 3 < this.cols) {
                        let [score, won] = this.score([board[r][c], board[r + 1][c + 1], board[r + 2][c + 2], board[r + 3][c + 3]])
                        totalScore += score;
                        if (!winningMoveFound) {
                            winningMoveFound = won;
                        }
                    }
                    // negative slope diagonal;
                    if (c - 3 > 0) {
                        let [score, won] = this.score([board[r][c], board[r + 1][c - 1], board[r + 2][c - 2], board[r + 3][c - 3]])
                        totalScore += score;
                        if (!winningMoveFound) {
                            winningMoveFound = won;
                        }
                    }
                }

            }
        }
        return [totalScore, emptySlotFound, winningMoveFound];
    }

    getPossibleCols(): number[] {
        let mid = Math.floor(this.cols / 2);
        return Array.from(Array(this.cols).keys())
            .filter(col => this.findEmptyRow(col) != NOT_POSSIBLE)
            .map(a => [Math.abs(a - mid), a])
            .sort((a, b) => a[0] - b[0])
            .map(a => a[1]);
    }

    getPossibleRowCols() {
        let cols = this.getPossibleCols();
        return cols.map(col => [this.findEmptyRow(col), col]);
    }

    /**
     * Perfoms a simple minimax algorithm
     * @param maximizing boolean to indicate if the operation is max or min
     * @param depth the number of function calls so far
     * @returns 
     */
    minimax(maximizing: boolean, depth: number, alpha: number, beta: number): number {
        // let [score, movesLeft, winningMoveFound] = this.scoreBasedOnCurrentState();
        let [score, movesLeft, winningMoveFound] = this.scoreBasedOnWinningPositions();
        // this.printBoardToConsole();
        // console.log(`Score for current state: ${score}, depth ${depth}`);
        if (depth == 0 || !movesLeft || winningMoveFound) {
            return score;
        }
        // sort to get the columns in the middle first.
        // this will help optimize the first move
        let rowCols = this.getPossibleRowCols();

        if (maximizing) {
            let bestScore = -Infinity;
            for (let [row, col] of rowCols) {
                this.board[row][col] = PlayerTypes.Computer;
                this.winPositionState.occupyPosition(row, col, PlayerTypes.Computer);
                let score = this.minimax(false, depth - 1, alpha, beta);
                // Reset the board
                this.board[row][col] = PlayerTypes.None;
                this.winPositionState.resetPosition(row, col);
                bestScore = Math.max(score, bestScore);
                alpha = Math.max(alpha, bestScore);
                if (beta <= alpha) {
                    break;
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let [row, col] of rowCols) {
                this.board[row][col] = PlayerTypes.Human;
                this.winPositionState.occupyPosition(row, col, PlayerTypes.Human);
                let score = this.minimax(true, depth - 1, alpha, beta);
                // Reset the board
                this.board[row][col] = PlayerTypes.None;
                this.winPositionState.resetPosition(row, col);
                bestScore = Math.min(score, bestScore);
                beta = Math.min(beta, bestScore);
                if (beta <= alpha) {
                    break;
                }
            }
            return bestScore;
        }
    }

    /**
     * Makes a random move 
     * @returns a number that indicates the col for which the move was made. 
     *  Throws error if it could not make a move
     */
    randomMove() {
        const player = PlayerTypes.Computer
        // We do a random Move
        let col = NOT_POSSIBLE;
        let items = [0, 1, 2, 3, 4, 5, 6];
        items.sort(() => 0.5 - Math.random());
        let i = 0;
        for (; i < items.length; i++) {
            if (this.board[5][items[i]] === PlayerTypes.None) {
                col = items[i];
                this.makeMove(player, col);
                break;
            }
        }
        if (col === NOT_POSSIBLE) {
            throw new Error("Exhausted all moves!");
        }
    }

    printAllMoves() {
        console.log(JSON.stringify(this.getAllMoves()));
    }

    getAllMoves() {
        return this.moves.map(([p, [row, col]]) => {
            return {
                player: p,
                move: {
                    row: row,
                    col: col
                }
            }
        });
    }

    /**
     * Makes a move for the given player in the given col
     * @param player 
     * @param col 
     */
    makeMove(player: Player, col: number) {
        this.publishOnMoveStart(player, col);
        const row = this.dropPiece(player, col);
        if (row === NOT_POSSIBLE) {
            throw new Error("Invalid move, row = -1");
        }
        this.moves.push([player, [row, col]]);
        let result = this.checkForWinner();
        if (result) {
            let [[one, two, three, four], p] = result;
            console.log(`Found winning coords: ${one}, ${two}, ${three}, ${four}, player: ${playerToString(p)}`);
            this.gameOver = true;
            let [coords, winningPlayer] = result;
            this.winningCoords = coords;
            this.winner = winningPlayer;
        }
        this.publishOnMoveEnd(player, col, row);
    }

    /**
     * Drops the piece in the given col to the highest possible row
     * @param player 
     * @param col 
     * @returns 
     */
    dropPiece(player: Player, col: number): number {
        let row = this.findEmptyRow(col);
        if (row !== NOT_POSSIBLE) {
            this.board[row][col] = player;
            this.numberOfPieces++;
        }
        return row;
    }

    /**
     * Finds the first available empty row
     * @param col the column where the row is searched
     * @returns 
     */
    findEmptyRow(col: number): number {
        let row = 0;
        // For a given column, increment the row variable until we find an empty slot
        while (this.board[row][col] !== PlayerTypes.None && (++row < this.rows));
        if (row === this.rows) {
            return NOT_POSSIBLE;
        }
        return row;
    }

    /**
     * @returns the status if it finds a winner or null otherwise
     */
    private checkForWinner(): [Array<[number, number]>, Player] {
        let emptySlotFound = false;
        let board = this.board;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                let player = board[r][c];
                if (player == PlayerTypes.None) {
                    emptySlotFound = true;
                    continue; // don't check empty slots
                }
                if (c + 3 < this.cols &&
                    player == board[r][c + 1] && // look right
                    player == board[r][c + 2] &&
                    player == board[r][c + 3]) {
                    let coords: Array<[number, number]> = [];
                    coords.push([r, c]);
                    coords.push([r, c + 1]);
                    coords.push([r, c + 2]);
                    coords.push([r, c + 3]);
                    return [coords, player];
                }
                if (r + 3 < this.rows) {
                    if (player == board[r + 1][c] && // look up
                        player == board[r + 2][c] &&
                        player == board[r + 3][c]) {
                        let coords: Array<[number, number]> = [];
                        coords.push([r, c]);
                        coords.push([r + 1, c]);
                        coords.push([r + 2, c]);
                        coords.push([r + 3, c]);
                        return [coords, player];
                    }
                    if (c + 3 < this.cols &&
                        player == board[r + 1][c + 1] && // look up & right
                        player == board[r + 2][c + 2] &&
                        player == board[r + 3][c + 3]) {
                        let coords: Array<[number, number]> = [];
                        coords.push([r, c]);
                        coords.push([r + 1, c + 1]);
                        coords.push([r + 2, c + 2]);
                        coords.push([r + 3, c + 3]);
                        return [coords, player];
                    }
                    if (c - 3 >= 0 &&
                        player == board[r + 1][c - 1] && // look up & left
                        player == board[r + 2][c - 2] &&
                        player == board[r + 3][c - 3]) {
                        let coords: Array<[number, number]> = [];
                        coords.push([r, c]);
                        coords.push([r + 1, c - 1]);
                        coords.push([r + 2, c - 2]);
                        coords.push([r + 3, c - 3]);
                        return [coords, player];
                    }
                }
            }
        }
        if (!emptySlotFound) {
            // All slots are full, this is a tie
            return [[], PlayerTypes.None]
        }
        return null;
    }


    private subscribe(event: GameEvent, callback: any, context: any) {
        let v = this.subscribers.get(event);
        if (!v) {
            this.subscribers.set(event, []);
        }
        let subscription = {
            context: context,
            method: callback
        }
        this.subscribers.get(event).push(subscription);
    };


    /** 
     * Callbacks
    */

    onMoveEnd(callback: OnMoveEnd, context: any) {
        this.subscribe(GameEvent.MoveEnd, callback, context);
    }

    onMoveStart(callback: OnMoveStart, context: any) {
        this.subscribe(GameEvent.MoveStart, callback, context);
    }

    publishOnMoveStart(player: number, column: number) {
        let subscriptions: Subscription[] = this.subscribers.get(GameEvent.MoveStart) || [];
        subscriptions.forEach(sub => {
            let { context, method } = sub;
            let boundMethod = method.bind(context);
            boundMethod(player, String(column));
        })
    }

    publishOnMoveEnd(player: number, column: number, row: number) {
        let subscriptions: Subscription[] = this.subscribers.get(GameEvent.MoveEnd) || [];
        subscriptions.forEach(sub => {
            let { context, method } = sub;
            let boundMethod = method.bind(context);
            boundMethod(player, String(column), row);
        })
    }

}

