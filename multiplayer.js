import { GAME_CONFIG } from "./server.js";

export class MultiplayerGame {
  constructor(wsManager, renderer, cells) {
    this.wsManager = wsManager;
    this.renderer = renderer;
    this.cells = cells;
    this.playerNumber = null;
    this.playerName = null;
    this.player1Name = null;
    this.player2Name = null;
    this.currentRoomId = null;
    this.gameState = null;
    this.patternDetector = null;
  }

  start(data) {
    this.playerNumber = data.player;
    this.playerName = data.playerName;
    this.currentRoomId = data.roomId;
    this.gameState = data.gameState;
    this.player1Name = data.player1Name || "Player 1";
    this.player2Name = data.player2Name || "Player 2";
    
    this.renderer.setPlayerNames(
      data.player1Name || "Waiting...",
      data.player2Name || "Waiting..."
    );
    
    this.render(data.lines || [], false);
  }

  handleMove(cellIndex) {
    if (!this.gameState) {
      console.log("No game state");
      return;
    }
    
    // Check if cell is empty
    if (this.gameState.board[cellIndex] !== "") {
      return;
    }
    
    // Check if it's this player's turn
    if (this.gameState.currentPlayer !== this.playerNumber) {
      return;
    }
    
    const mark = this.playerNumber === 1 ? GAME_CONFIG.player1Mark : GAME_CONFIG.player2Mark;
    this.gameState.playAudio();
    
    this.wsManager.send({
      type: 'move',
      roomId: this.currentRoomId,
      cell: cellIndex,
      player: this.playerNumber,
      mark
    });
  }

  updateGameState(data) {
    this.gameState = data.gameState;
    this.render(data.lines || [], data.isGameOver || false);
  }

  getTurnMessage() {
    if (!this.gameState) return "Waiting...";
    
    if (this.gameState.currentPlayer === this.playerNumber) {
      const mark = this.playerNumber === 1 ? GAME_CONFIG.player1Mark : GAME_CONFIG.player2Mark;
      return `Your turn! (${mark})`;
    }
    return "Opponent's turn";
  }

  render(lines, isGameOver) {
    if (!this.gameState) return;
    
    this.renderer.render(
      this.cells, 
      this.gameState, 
      lines, 
      this.getTurnMessage(), 
      isGameOver,
      this.player1Name,
      this.player2Name
    );
  }

  endGame() {
    this.wsManager.send({
      type: 'endGame',
      roomId: this.currentRoomId
    });
  }
}