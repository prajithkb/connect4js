export enum GameEvent {
    MoveStart,
    MoveEnd
}


export type OnMoveEnd = (player: Player, col: string, row: number) => void;

export type OnMoveStart = (player: Player, col: string) => void;

export type Player = number;

export enum PlayerTypes {
    None = -1,
    First = 0,
    Second = 1
}

interface Subscription {
    context: any,
    method: any
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
    private subscribers: Map<GameEvent, Subscription[]>
    constructor(name: string, rows: number, cols: number) {
        this.name = name
        this.subscribers = new Map();
        this.rows = rows;
        this.cols = cols;
        this.board = [];
        this.numberOfPieces = 0;
        for (var i = 0; i < this.rows; i++) {
            this.board.push([]);
            for (var j = 0; j < this.cols; j++) {
                this.board[i][j] = PlayerTypes.None;
            }
        }
    }

    /**
     * TODO: Makes a smart move
     * Currently it is dumb
     * @param player 
     */
    smartMove(player: Player) {
        console.log(`Auto move, player :${player}`);
        this.randomMove(player);
    };

    /**
     * Makes a random move for the given player
     * @param player 
     * @returns a number that indicates the col for which the move was made. 
     *  -1 if it could not make a move
     */
    randomMove(player: Player) {
        // We do a random Move
        let col = -1;
        let items = [0, 1, 2, 3, 4, 5, 6];
        items.sort(function () {
            return 0.5 - Math.random();
        });
        let i = 0;
        for (; i < items.length; i++) {
            if (this.board[5][items[i]] === -1) {
                col = items[i];
                this.makeMove(player, col);
                break;
            }
        }
        if (col === -1) {
            throw new Error("Exhausted all moves!");
        }
    }

    /**
     * Makes a move for the given player in the given col
     * @param player 
     * @param col 
     */
    makeMove(player: Player, col: number) {
        console.log(`Make move, player ${player}, col ${col}`);
        this.publishOnMoveStart(player, col);
        const row = this.dropPiece(player, col);
        if (row === -1) {
            throw new Error("Invalid move, row = -1");
        }
        let result = this.checkStatus();
        if (result) {
            console.log(`Found winning coords: ${result}`);
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
    dropPiece(player: Player, col: number) {
        console.log(`Drop piece, player:  ${player}, col: ${col}`);
        let row = 0;
        while (this.board[row][col] !== -1 && (++row < this.rows));
        if (row === this.rows) {
            return -1;
        }
        this.board[row][col] = player;
        this.numberOfPieces++;
        return row;
    }

    private checkStatus(): [Array<[number, number]>, Player] {
        console.log("Checking status");
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

