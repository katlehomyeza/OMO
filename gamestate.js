import { GAME_CONFIG } from "./server.js";

export class GameState {
  constructor() {
    this.board = Array(GAME_CONFIG.gridSize * GAME_CONFIG.gridSize).fill("");
    this.currentPlayer = 1;
    this.score1 = 0;
    this.score2 = 0;
  }

  makeMove(cellIndex, mark) {
    this.board[cellIndex] = mark;
  }

  isValidMove(cellIndex, playerNumber) {
    return this.board[cellIndex] === "" && this.currentPlayer === playerNumber;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === 1 ? 2 : 1;
  }

  incrementScore(player) {
    if (player === 1) {
      this.score1++;
    } else {
      this.score2++;
    }
  }

  isBoardFull() {
    return this.board.every(cell => cell !== "");
  }

  getEmptyCells() {
    return this.board
      .map((cell, index) => cell === "" ? index : null)
      .filter(index => index !== null);
  }
}