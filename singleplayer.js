import { GameState } from "./gamestate.js";
import { GAME_CONFIG } from "./server.js";

export class SinglePlayerGame {
  constructor(gameState, patternDetector, renderer, cells) {
    this.gameState = gameState;
    this.patternDetector = patternDetector;
    this.renderer = renderer;
    this.cells = cells;
    this.lines = [];
    this.playerNumber = null;
    this.playerName = null;
  }

  start(name) {
    this.playerNumber = Math.random() < 0.5 ? 1 : 2;
    this.playerName = name;
    this.lines = [];
    
    this.gameState = new GameState();
    this.renderer.setPlayerNames(name, "AI Bot");
    this.render();
  }

  handlePlayerMove(cellIndex) {
    if (!this.gameState.isValidMove(cellIndex, 1)) {
      return;
    }

    this.gameState.makeMove(cellIndex, GAME_CONFIG.player1Mark);
    const scoredOMO = this.checkAndUpdateOMO(1);
    
    if (this.gameState.isBoardFull()) {
      this.render();
      return;
    }
    
    if (scoredOMO) {
      this.render();
      return;
    }
    
    this.gameState.switchPlayer();
    this.render();
    
    setTimeout(() => this.makeAIMove(), GAME_CONFIG.aiMoveDelay);
  }

  makeAIMove() {
    const emptyCells = this.gameState.getEmptyCells();
    
    if (emptyCells.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    const cellIndex = emptyCells[randomIndex];

    this.gameState.makeMove(cellIndex, GAME_CONFIG.player2Mark);
    const scoredOMO = this.checkAndUpdateOMO(2);

    if (scoredOMO && !this.gameState.isBoardFull()) {
      this.render();
      setTimeout(() => this.makeAIMove(), GAME_CONFIG.aiConsecutiveMoveDelay);
      return;
    }

    if (!this.gameState.isBoardFull()) {
      this.gameState.switchPlayer();
    }
    
    this.render();
  }

  checkAndUpdateOMO(player) {
    const previousScore = player === 1 ? this.gameState.score1 : this.gameState.score2;
    const newLines = this.patternDetector.findOMOPatterns(this.gameState.board, this.lines, player);
    
    newLines.forEach(line => {
      this.lines.push(line);
      this.gameState.incrementScore(player);
    });
    
    const currentScore = player === 1 ? this.gameState.score1 : this.gameState.score2;
    return currentScore > previousScore;
  }

  getTurnMessage() {
    if (this.gameState.currentPlayer === 1) {
      return `Your turn! (${GAME_CONFIG.player1Mark})`;
    }
    return `AI's turn (${GAME_CONFIG.player2Mark})`;
  }

  render() {
    this.renderer.render(this.cells, this.gameState, this.lines, this.getTurnMessage());
  }
}