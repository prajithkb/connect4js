// use colored::*;
#![allow(dead_code)]
use crossterm::style::Stylize;
use log::info;
use prettytable::{Attr, Cell, Row, Table};
use std::cmp::{self};
use std::fs::File;
use std::io::{self, stdout};
use std::vec::Vec;
use std::{fmt::Display, thread, time::Duration};

use crossterm::cursor::{RestorePosition, SavePosition};

use crossterm::terminal::{Clear, ClearType};
use crossterm::{style::Print, ExecutableCommand};

// import commonly used items from the prelude:
use rand::prelude::*;
static mut COUNTER: u128 = 0;

fn increment() {
    unsafe {
        COUNTER += 1;
    }
}

fn get_count() -> u128 {
    unsafe { COUNTER }
}

fn clear_count() {
    unsafe { COUNTER = 0 }
}

struct Connect4 {
    rows: usize,
    cols: usize,
    board: Vec<Vec<Option<Player>>>,
    rg: ThreadRng,
}

#[derive(Clone, PartialEq, Debug)]
enum Player {
    Human,
    Computer,
}

impl Player {
    fn piece(&self) -> char {
        match self {
            Player::Human => '\u{1F534}',
            Player::Computer => '\u{1F7E1}',
        }
    }

    fn other(&self) -> Player {
        match self {
            Player::Human => Player::Computer,
            Player::Computer => Player::Human,
        }
    }
}

impl Display for Player {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.write_fmt(format_args!("{:#?}[{}]", self, self.piece()))
    }
}

enum Status {
    WonBy(Player),
    Tie,
    Running,
}

type InternalStatus = (Status, i32);

type CurrentState = (Vec<(usize, usize)>, InternalStatus);

enum Connect4Error {
    InvalidMove,
}

impl Connect4 {
    fn new(rows: usize, cols: usize) -> Self {
        Connect4 {
            rows,
            cols,
            board: vec![vec![None; cols]; rows],
            rg: thread_rng(),
        }
    }

    fn random_move(&mut self, player: Player) -> Result<CurrentState, Connect4Error> {
        let mut items: [usize; 7] = [0, 1, 2, 3, 4, 5, 6];
        let board = &mut self.board;
        let mut random_gen = self.rg.clone();
        // Random sort
        items.sort_by(|_x, _y| random_gen.gen_range(0..10).cmp(&5));
        for &col in items.iter() {
            // if the last row for this col is free, we can move in that col
            if board[0][col].is_none() {
                return self.move_and_check(player, col);
            }
        }
        Err(Connect4Error::InvalidMove)
    }

    fn smart_move(&mut self, player: Player) -> Result<CurrentState, Connect4Error> {
        clear_count();
        info!("Next smart move by {}", player);
        let (other_player_strategy, starting_value) = match player {
            Player::Human => (true, i32::MAX),
            Player::Computer => (false, i32::MIN),
        };
        let mut best_score = starting_value;
        let mut best_col = 0;
        for col in 0..self.cols {
            if let Ok(row) = self.drop_piece(player.clone(), col) {
                // Minimize for the other player
                let score =
                    self.minimax(player.other(), other_player_strategy, i32::MIN, i32::MAX, 0);
                info!("Found score {} for col {}", score, col);
                self.board[row][col] = None;
                match player {
                    Player::Human => {
                        if score < best_score {
                            best_score = score;
                            best_col = col;
                        }
                    }
                    Player::Computer => {
                        if score > best_score {
                            best_score = score;
                            best_col = col;
                        }
                    }
                }
            }
        }
        info!(
            "Found col {}, score {},  as the best option for {}",
            best_col, best_score, player
        );
        self.move_and_check(player, best_col)
    }
    fn minimax(
        &mut self,
        player: Player,
        maximizing: bool,
        mut alpha: i32,
        mut beta: i32,
        depth: u32,
    ) -> i32 {
        increment();
        let (score, moves_left) = self.score_based_current_state();
        // info!("Count {}, score {}, depth {}", get_count(), score, depth);
        if depth >= 6 || !moves_left {
            return score;
        }
        let other_player = player.other();
        if maximizing {
            let mut best_score = i32::MIN;
            for col in 0..self.cols {
                if let Ok(row) = self.drop_piece(player.clone(), col) {
                    let score = self.minimax(other_player.clone(), false, alpha, beta, depth + 1);
                    self.board[row][col] = None;
                    best_score = cmp::max(score, best_score);
                    alpha = cmp::max(alpha, best_score);
                    if beta <= alpha {
                        break;
                    }
                }
            }
            best_score
        } else {
            let mut best_score = i32::MAX;
            for col in 0..self.cols {
                if let Ok(row) = self.drop_piece(player.clone(), col) {
                    let score = self.minimax(other_player.clone(), true, alpha, beta, depth + 1);
                    self.board[row][col] = None;
                    best_score = cmp::min(score, best_score);
                    beta = cmp::min(beta, best_score);
                    if beta <= alpha {
                        break;
                    }
                }
            }
            best_score
        }
    }

    fn drop_piece(&mut self, player: Player, col: usize) -> Result<usize, Connect4Error> {
        let board = &mut self.board;
        // find the first position of an empty index.
        let index = board
            .iter()
            .rev()
            .map(|row| &row[col])
            .position(|v| v.is_none());
        if let Some(i) = index {
            board[self.rows - 1 - i][col] = Some(player);
            Ok(self.rows - 1 - i)
        } else {
            // This row is full so an invalid move
            Err(Connect4Error::InvalidMove)
        }
    }

    fn move_and_check(
        &mut self,
        player: Player,
        col: usize,
    ) -> Result<CurrentState, Connect4Error> {
        self.drop_piece(player, col)?;
        Ok(self.check_winner())
    }

    fn score(&self, cells: &[Option<Player>]) -> i32 {
        let mut empty = 0;
        let mut count_human = 0;
        let mut count_computer = 0;
        for cell in cells {
            if let Some(p) = cell {
                match p {
                    Player::Human => (count_human += 1),
                    Player::Computer => (count_computer += 1),
                }
            } else {
                empty += 1;
            }
        }
        match (count_human, count_computer, empty) {
            (4, 0, 0) => -100,
            (3, 0, 1) => -50,
            (2, 0, 2) => -20,
            (1, 0, 3) => -10,
            (0, 4, 0) => 100,
            (0, 3, 1) => 50,
            (0, 2, 2) => 20,
            (0, 1, 3) => 10,
            _ => 0,
        }
    }

    fn score_based_current_state(&self) -> (i32, bool) {
        let mut score = 0;
        let board = &self.board;
        let mut empty_cell_found = false;
        for r in 0..self.rows {
            for c in 0..self.cols {
                if board[r][c].is_none() {
                    empty_cell_found = true;
                }
                if c + 3 < self.cols {
                    let cells = [
                        board[r][c].clone(),
                        board[r][c + 1].clone(),
                        board[r][c + 2].clone(),
                        board[r][c + 3].clone(),
                    ];
                    score += self.score(&cells);
                }
                if r + 3 < self.rows {
                    let cells = [
                        board[r][c].clone(),
                        board[r + 1][c].clone(),
                        board[r + 2][c].clone(),
                        board[r + 3][c].clone(),
                    ];
                    score += self.score(&cells);
                    if c + 3 < self.cols {
                        let cells = [
                            board[r][c].clone(),
                            board[r + 1][c + 1].clone(),
                            board[r + 2][c + 2].clone(),
                            board[r + 3][c + 3].clone(),
                        ];
                        score += self.score(&cells);
                    }
                }
                if !c.overflowing_sub(3).1 && r + 3 < self.rows {
                    let cells = [
                        board[r][c].clone(),
                        board[r + 1][c - 1].clone(),
                        board[r + 2][c - 2].clone(),
                        board[r + 3][c - 3].clone(),
                    ];
                    score += self.score(&cells);
                }
            }
        }
        (score, empty_cell_found)
    }

    fn check_winner(&self) -> CurrentState {
        let board = &self.board;
        let mut empty_cell_found = false;
        let score = 0;
        for r in 0..self.rows {
            for c in 0..self.cols {
                let player = board[r][c].clone();
                // If there is no player, it is an empty slot,
                // save that information so we can use it later.
                if player.is_none() {
                    empty_cell_found = true;
                    continue;
                }
                let winner = player.clone().unwrap();
                if c + 3 < self.cols &&
                    player == board[r][c + 1] && // look right
                    player == board[r][c + 2] &&
                    player == board[r][c + 3]
                {
                    return (
                        vec![(r, c), (r, c + 1), (r, c + 2), (r, c + 3)],
                        (Status::WonBy(winner), score),
                    );
                }
                if r + 3 < self.rows {
                    if player == board[r + 1][c] && // look up
                        player == board[r + 2][c] &&
                        player == board[r + 3][c]
                    {
                        return (
                            vec![(r, c), (r + 1, c), (r + 2, c), (r + 3, c)],
                            (Status::WonBy(winner), score),
                        );
                    }
                    if c + 3 < self.cols &&
                        player == board[r + 1][c + 1] && // look up & right
                        player == board[r + 2][c + 2] &&
                        player == board[r + 3][c + 3]
                    {
                        return (
                            vec![(r, c), (r + 1, c + 1), (r + 2, c + 2), (r + 3, c + 3)],
                            (Status::WonBy(winner), score),
                        );
                    }
                    if !c.overflowing_sub(3).1  &&
                        player == board[r + 1][c - 1] && // look up & left
                        player == board[r + 2][c - 2] &&
                        player == board[r + 3][c - 3]
                    {
                        return (
                            vec![(r, c), (r + 1, c - 1), (r + 2, c - 2), (r + 3, c - 3)],
                            (Status::WonBy(winner), score),
                        );
                    }
                }
            }
        }
        if empty_cell_found {
            (vec![], (Status::Running, score))
        } else {
            (vec![], (Status::Tie, score))
        }
    }

    fn pretty_print(&self, winning_cells: &[(usize, usize)]) -> Result<(), io::Error> {
        let mut table = Table::new();
        let header: Vec<Cell> = (-1..self.cols as i32)
            .into_iter()
            .map(|i| {
                if i >= 0 {
                    i.to_string()
                } else {
                    "".to_string()
                }
            })
            .map(|i| Cell::new(&i))
            .collect();
        table.add_row(Row::new(header));
        for row in 0..self.rows {
            // let mut line = String::from("|");
            let mut cells: Vec<Cell> = vec![Cell::new(&row.to_string())];
            for col in 0..self.cols {
                let styled_char = self.board[row][col]
                    .clone()
                    .map(|p| p.piece())
                    .map(|c| c.stylize().to_string())
                    .unwrap_or_else(|| "  ".grey().to_string());
                let mut cell = Cell::new(&styled_char);
                if winning_cells.contains(&(row, col)) {
                    cell.style(Attr::Blink);
                }
                cells.push(cell);
            }
            table.add_row(Row::new(cells));
        }
        table.printstd();
        Ok(())
    }
}

fn next_move(player: Player, connect4: &mut Connect4) -> Result<CurrentState, Connect4Error> {
    match player {
        Player::Human => connect4.smart_move(player),
        Player::Computer => connect4.smart_move(player),
    }
}

fn main() -> crossterm::Result<()> {
    let f = File::create("log.txt")?;
    f.set_len(0)?;
    env_logger::Builder::from_default_env()
        .target(env_logger::Target::Pipe(Box::new(f)))
        .format_timestamp_millis()
        .is_test(true)
        .init();
    println!(
        "Welcome to the simulation of Connect 4! Players: {} & {}",
        Player::Human,
        Player::Computer
    );
    info!("Starting the game...");
    let mut connect4 = Connect4::new(6, 7);
    let players = [Player::Human, Player::Computer];
    let mut num_moves = 0;
    let mut next_player = players[num_moves % players.len()].clone();
    stdout().execute(SavePosition)?;
    while let Ok((winning_cells, (status, _score))) = next_move(next_player.clone(), &mut connect4)
    {
        thread::sleep(Duration::from_secs(1));
        stdout()
            .execute(RestorePosition)?
            .execute(Clear(ClearType::CurrentLine))?
            .execute(Print(format_args!(
                "Player: {} made the move, {} thinking...\n",
                next_player,
                next_player.other()
            )))?;
        connect4.pretty_print(&winning_cells)?;
        match status {
            // We have a winner
            Status::WonBy(winner) => {
                stdout().execute(Print(format_args!(
                    "Game over, {} won! Winning cells: {:?}",
                    winner, winning_cells
                )))?;
                break;
            }
            // It is a tie!
            Status::Tie => {
                stdout().execute(Print("Game over, it is a tie"))?;
                break;
            }
            // Continue running...
            _ => {}
        };
        num_moves += 1;
        next_player = players[num_moves % players.len()].clone();
    }
    Ok(())
}
#[cfg(test)]
mod test {
    #[test]
    fn test_this() {}
}
