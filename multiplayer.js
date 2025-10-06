export class MultiplayerGame {
  constructor(wsManager, renderer, cells) {
    this.wsManager = wsManager;
    this.renderer = renderer;
    this.cells = cells;
    this.playerNumber = null;
    this.playerName = null;
    this.currentRoomId = null;
    this.gameState = null;
  }

  start(data) {
    this.playerNumber = data.player;
    this.playerName = data.playerName;
    this.currentRoomId = data.roomId;
    this.gameState = data.gameState;
    
    this.renderer.setPlayerNames(
      data.player1Name || "Waiting...",
      data.player2Name || "Waiting..."
    );
    
    this.render(data.lines || []);
  }

  handleMove(cellIndex) {
    if (!this.gameState || !this.gameState.isValidMove(cellIndex, this.playerNumber)) {
      return;
    }
    
    const mark = this.playerNumber === 1 ? GAME_CONFIG.player1Mark : GAME_CONFIG.player2Mark;
    
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
    this.render(data.lines);
  }

  getTurnMessage() {
    if (this.gameState.currentPlayer === this.playerNumber) {
      const mark = this.playerNumber === 1 ? GAME_CONFIG.player1Mark : GAME_CONFIG.player2Mark;
      return `Your turn! (${mark})`;
    }
    return "Opponent's turn";
  }

  render(lines) {
    this.renderer.render(this.cells, this.gameState, lines, this.getTurnMessage());
  }

  endGame() {
    this.wsManager.send({
      type: 'endGame',
      roomId: this.currentRoomId
    });
  }
}
