import { WebSocketManager } from "./socketmanager.js";
import { PatternDetector } from "./patterndetector.js";
import { SinglePlayerGame } from "./singleplayer.js";
import { MultiplayerGame } from "./multiplayer.js";
import { GameState } from "./gamestate.js";

export const GAME_CONFIG = {
  gridSize: 12,
  cellSize: 60,
  gap: 5,
  maxNameLength: 15,
  aiMoveDelay: 1000,
  aiConsecutiveMoveDelay: 1500,
  lineWidth: 5,
  svgPadding: 10,
  player1Mark: "O",
  player2Mark: "M",
  player1Color: "#ff6b6b",
  player2Color: "#4ecdc4"
};



class GameRenderer {
  constructor() {
    this.grid = document.getElementById('grid');
    this.svg = document.getElementById("line-overlay");
    this.turnDisplay = document.getElementById("turn-display");
    this.score1Display = document.getElementById("score1");
    this.score2Display = document.getElementById("score2");
    this.player1Label = document.getElementById("player1");
    this.player2Label = document.getElementById("player2");
    this.player1Container = document.getElementById("player1-display");
    this.player2Container = document.getElementById("player2-display");
    
    this.initializeGrid();
    this.initializeSVG();
  }

  initializeGrid() {
    this.grid.style.gridTemplateColumns = `repeat(${GAME_CONFIG.gridSize}, ${GAME_CONFIG.cellSize}px)`;
    this.grid.style.gridTemplateRows = `repeat(${GAME_CONFIG.gridSize}, ${GAME_CONFIG.cellSize}px)`;
  }

  initializeSVG() {
    const totalWidth = GAME_CONFIG.gridSize * GAME_CONFIG.cellSize + 
                      (GAME_CONFIG.gridSize - 1) * GAME_CONFIG.gap;
    const totalHeight = GAME_CONFIG.gridSize * GAME_CONFIG.cellSize + 
                       (GAME_CONFIG.gridSize - 1) * GAME_CONFIG.gap;
    
    this.svg.setAttribute("width", totalWidth + 20);
    this.svg.setAttribute("height", totalHeight + 20);
    this.svg.style.left = "-10px";
    this.svg.style.top = "-10px";
  }

  updateBoard(cells, gameState) {
    gameState.board.forEach((mark, index) => {
      cells[index].innerText = mark;
    });
  }

  updateScores(gameState) {
    this.score1Display.innerText = gameState.score1;
    this.score2Display.innerText = gameState.score2;
  }

  updatePlayerHighlight(currentPlayer) {
    if (currentPlayer === 1) {
      this.player1Container.classList.add('active');
      this.player2Container.classList.remove('active');
    } else {
      this.player2Container.classList.add('active');
      this.player1Container.classList.remove('active');
    }
  }

  updateTurnDisplay(message) {
    this.turnDisplay.innerText = message;
  }

  setPlayerNames(player1Name, player2Name) {
    this.player1Label.innerText = player1Name;
    this.player2Label.innerText = player2Name;
  }

  drawLines(lines) {
    this.svg.innerHTML = "";
    
    lines.forEach(line => {
      const svgLine = this.createSVGLine(line);
      this.svg.appendChild(svgLine);
    });
  }

  createSVGLine(line) {
    const [start, , end] = line.cells;
    const coordinates = this.calculateLineCoordinates(start, end);
    
    const svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    svgLine.setAttribute("x1", coordinates.x1);
    svgLine.setAttribute("y1", coordinates.y1);
    svgLine.setAttribute("x2", coordinates.x2);
    svgLine.setAttribute("y2", coordinates.y2);
    svgLine.setAttribute("stroke", this.getPlayerColor(line.player));
    svgLine.setAttribute("stroke-width", GAME_CONFIG.lineWidth);
    svgLine.setAttribute("stroke-linecap", "round");
    
    return svgLine;
  }

  calculateLineCoordinates(start, end) {
    const offset = GAME_CONFIG.svgPadding;
    const cellWithGap = GAME_CONFIG.cellSize + GAME_CONFIG.gap;
    const halfCell = GAME_CONFIG.cellSize / 2;
    
    return {
      x1: start[1] * cellWithGap + halfCell + offset,
      y1: start[0] * cellWithGap + halfCell + offset,
      x2: end[1] * cellWithGap + halfCell + offset,
      y2: end[0] * cellWithGap + halfCell + offset
    };
  }

  getPlayerColor(player) {
    return player === 1 ? GAME_CONFIG.player1Color : GAME_CONFIG.player2Color;
  }

  render(cells, gameState, lines, turnMessage) {
    this.updateBoard(cells, gameState);
    this.updateScores(gameState);
    this.updatePlayerHighlight(gameState.currentPlayer);
    this.updateTurnDisplay(turnMessage);
    this.drawLines(lines);
  }
}

class UIManager {
  constructor() {
    this.lobbySection = document.getElementById("lobby");
    this.gameSection = document.getElementById("game");
    this.lobbyStatus = document.getElementById("lobby-status");
    this.roomInput = document.getElementById("room-id");
    this.playerNameInput = document.getElementById("player-name");
  }

  showLobby() {
    this.lobbySection.style.display = "block";
    this.gameSection.style.display = "none";
  }

  showGame() {
    this.lobbySection.style.display = "none";
    this.gameSection.style.display = "block";
  }

  updateLobbyStatus(message) {
    this.lobbyStatus.innerText = message;
  }

  getPlayerName() {
    return this.playerNameInput.value.trim();
  }

  getRoomId() {
    return this.roomInput.value.trim();
  }

  focusPlayerNameInput() {
    this.playerNameInput.focus();
  }

  validatePlayerName(name) {
    if (!name) {
      this.updateLobbyStatus("❌ Please enter a valid player name!");
      this.focusPlayerNameInput();
      return false;
    }
    
    if (name.length > GAME_CONFIG.maxNameLength) {
      this.updateLobbyStatus(`❌ Name too long! Max ${GAME_CONFIG.maxNameLength} characters.`);
      this.focusPlayerNameInput();
      return false;
    }
    
    return true;
  }

  generateRoomId() {
    return "ROOM" + Math.floor(Math.random() * 1000);
  }
}

class GameController {
  constructor() {
    this.wsManager = new WebSocketManager("ws://localhost:8080");
    this.uiManager = new UIManager();
    this.renderer = new GameRenderer();
    this.patternDetector = new PatternDetector(GAME_CONFIG.gridSize);
    
    this.cells = this.createGridCells();
    
    this.singlePlayerGame = new SinglePlayerGame(
      new GameState(),
      this.patternDetector,
      this.renderer,
      this.cells
    );
    
    this.multiplayerGame = new MultiplayerGame(
      this.wsManager,
      this.renderer,
      this.cells
    );
    
    this.currentGameMode = null;
    this.initializeEventListeners();
    this.initializeWebSocketHandlers();
  }

  createGridCells() {
    const cells = [];
    const totalCells = GAME_CONFIG.gridSize * GAME_CONFIG.gridSize;
    
    for (let i = 0; i < totalCells; i++) {
      const button = document.createElement('button');
      button.id = i;
      button.addEventListener('click', () => this.handleCellClick(i));
      this.renderer.grid.appendChild(button);
      cells.push(button);
    }
    
    return cells;
  }

  initializeEventListeners() {
    document.getElementById("create-btn").addEventListener("click", () => this.createRoom());
    document.getElementById("join-btn").addEventListener("click", () => this.joinRoom());
    document.getElementById("single-btn").addEventListener("click", () => this.startSinglePlayer());
    document.getElementById("end-game-btn").addEventListener("click", () => this.endGame());

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  initializeWebSocketHandlers() {
    this.wsManager.onMessage((data) => {
      if (data.type === 'full') {
        alert(`Room ${data.roomId} is full!`);
      } else if (data.type === 'init') {
        this.handleMultiplayerInit(data);
      } else if (data.type === 'update') {
        this.multiplayerGame.updateGameState(data);
      }
    });
  }

  createRoom() {
    const playerName = this.uiManager.getPlayerName();
    
    if (!this.uiManager.validatePlayerName(playerName)) {
      return;
    }
    
    const roomId = this.uiManager.getRoomId() || this.uiManager.generateRoomId();
    
    this.wsManager.send({
      type: "createRoom",
      roomId,
      playerName
    });
    
    this.uiManager.updateLobbyStatus(`📢 Creating room: ${roomId} as ${playerName}...`);
  }

  joinRoom() {
    const playerName = this.uiManager.getPlayerName();
    const roomId = this.uiManager.getRoomId();
    
    if (!roomId) {
      this.uiManager.updateLobbyStatus("⚠️ Please enter a room code to join.");
      return;
    }
    
    this.wsManager.send({
      type: "joinRoom",
      roomId,
      playerName
    });
    
    this.uiManager.updateLobbyStatus(`🔗 Joining room: ${roomId}...`);
  }

  startSinglePlayer() {
    const name = this.uiManager.getPlayerName() || "Player";
    this.currentGameMode = "SINGLE_PLAYER";
    const selectedDifficultyBtn = document.querySelector('.difficulty-btn.selected');
    const difficulty = selectedDifficultyBtn ? selectedDifficultyBtn.dataset.difficulty : 'MEDIUM';
    this.uiManager.showGame();
    this.singlePlayerGame.start(name, difficulty);
  }

  handleMultiplayerInit(data) {
    this.currentGameMode = "MULTIPLAYER";
    this.uiManager.showGame();
    this.multiplayerGame.start(data);
  }

  handleCellClick(cellIndex) {
    if (this.currentGameMode === "SINGLE_PLAYER") {
      this.singlePlayerGame.handlePlayerMove(cellIndex);
    } else if (this.currentGameMode === "MULTIPLAYER") {
      this.multiplayerGame.handleMove(cellIndex);
    }
  }

  endGame() {
    if (this.currentGameMode === "SINGLE_PLAYER") {
      this.uiManager.showLobby();
      this.uiManager.updateLobbyStatus("Game ended. Start a new game!");
    } else if (this.currentGameMode === "MULTIPLAYER") {
      this.multiplayerGame.endGame();
    }
    
    this.currentGameMode = null;
  }
}

const gameController = new GameController();