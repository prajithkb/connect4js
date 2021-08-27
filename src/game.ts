export enum GameEvent {
    GameStart,
    MoveStart,
    MoveEnd,
    GameEnd
}


export type OnMoveEnd = (i: number, name: string, side: number) => void;

export type OnGameEnd = () => void;

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
    public gameOver: number;
    public rows: number;
    public board: Array<Array<Player>>;
    public winner: number;
    public winningCoords: number[];
    public cols: number;
    public numberOfPieces: number;
    private subscribers: Map<GameEvent, Subscription[]>
    constructor(name: string, rows: number, cols: number) {
        this.name = name
        this.subscribers = new Map();
        this.rows = rows;
        this.cols = cols;
        this.board = [];
        for (var i = 0; i < this.cols; i++) {
            this.board.push([]);
            for (var j = 0; j < this.rows; j++) {
                this.board[i][j] = PlayerTypes.None;
            }
        }
    }

    autoMove(player: Player) {
        console.log(`Auto move, player :${player}`);
        let col = -1;
        let items = [0, 1, 2, 3, 4, 5, 6];
        items.sort(function () {
            return 0.5 - Math.random();
        });
        let i = 0;
        for (; i < items.length; i++) {
            if (this.board[items[i]][5] === -1) {
                col = items[i];
                this.makeMove(player, col);
                break;
            }
        }
        if (col === -1) {
            throw new Error("Exhausted all moves!");
        }
    };

    makeMove(player: Player, col: number) {
        console.log(`Make move, player ${player}, col ${col}`);
        const row = this.dropPiece(player, col);
        if (row === -1) {
            throw new Error("Invalid move, row = -1");
        }
        this.publishOnMoveEnd(player, col, row);
    }

    dropPiece(player: Player, col: number) {
        console.log(`Drop piece, player:  ${player}, col: ${col}`);
        let row = 0;
        const column = this.board[col];
        while (column[row] !== -1 && (++row < this.rows));
        if (row === this.rows) {
            return -1;
        }
        this.board[col][row] = player;
        this.numberOfPieces++;
        return row;
    }

    onMoveEnd(callback: OnMoveEnd, context: any) {
        this.subscribe(GameEvent.MoveEnd, callback, context);
    }

    subscribe(event: GameEvent, callback: any, context: any) {
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

    publishOnMoveEnd(player: number, column: number, row: number) {
        let subscriptions: Subscription[] = this.subscribers.get(GameEvent.MoveEnd);
        subscriptions.forEach(sub => {
            let { context, method } = sub;
            let boundMethod = method.bind(context);
            boundMethod(player, String(column), row);
        })
    }


}

