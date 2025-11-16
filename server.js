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
  constructor(full=false) {
    this.grid = document.getElementById('grid');
    this.svg = document.getElementById("line-overlay");
    this.turnDisplay = document.getElementById("turn-display");
    this.score1Display = document.getElementById("score1");
    this.score2Display = document.getElementById("score2");
    this.player1Label = document.getElementById("player1");
    this.player2Label = document.getElementById("player2");
    this.player1Container = document.getElementById("player1-display");
    this.player2Container = document.getElementById("player2-display");

    if (full) {
      this.gameOverModal = document.getElementById("game-over-modal");
      this.winnerText = document.getElementById("winner-text");
      this.finalScore1 = document.getElementById("final-score1");
      this.finalScore2 = document.getElementById("final-score2");
      this.restartBtn = document.getElementById("restart-btn");
      this.exitBtn = document.getElementById("exit-btn");
    }

    this.initializeGrid();
    this.initializeSVG();
  }

  // 🧩 Modal setup
  initializeModalEvents(gameController) {
    if (!this.restartBtn || !this.exitBtn) return;
    
    this.restartBtn.addEventListener("click", () => {
      this.hideGameOverModal();
      if (gameController.currentGameMode === "SINGLE_PLAYER") {
        // Restart same difficulty
        const name = gameController.uiManager.getPlayerName() || "Player";
        const selectedDifficultyBtn = document.querySelector('.difficulty-btn.selected');
        const difficulty = selectedDifficultyBtn ? selectedDifficultyBtn.dataset.difficulty : 'MEDIUM';
        gameController.startSinglePlayer(name, difficulty);
      } else if (gameController.currentGameMode === "MULTIPLAYER") {
        // For multiplayer, reset UI only
        gameController.uiManager.showLobby();
        gameController.uiManager.updateLobbyStatus("🔁 Restart not supported in online mode. Create or join a new room.");
      }
    });

    this.exitBtn.addEventListener("click", () => {
      this.hideGameOverModal();
      gameController.uiManager.showLobby();
      gameController.uiManager.updateLobbyStatus("🏠 Back in lobby. Start a new game!");
    });
  }

  showGameOverModal(winner, score1, score2) {
    if (!this.gameOverModal) return;
    
    this.winnerText.textContent = winner ? `${winner} Wins! 🏆` : "It's a Draw! 🤝";
    this.finalScore1.textContent = score1;
    this.finalScore2.textContent = score2;
    this.gameOverModal.classList.remove("hidden");
  }

  hideGameOverModal() {
    if (!this.gameOverModal) return;
    this.gameOverModal.classList.add("hidden");
  }

  initializeGrid() {
    this.grid.style.gridTemplateColumns = `repeat(${GAME_CONFIG.gridSize}, minmax(0, 1fr))`;
    this.grid.style.gridTemplateRows = `repeat(${GAME_CONFIG.gridSize}, minmax(0, 1fr))`;
  }

  initializeSVG() {
    // Wait for grid to render, then set SVG size
    setTimeout(() => {
      const gridRect = this.grid.getBoundingClientRect();
      this.svg.setAttribute("width", gridRect.width);
      this.svg.setAttribute("height", gridRect.height);
    }, 100);
  }

  calculateLineCoordinates(start, end) {
    const firstCell = this.grid.querySelector('button');
    if (!firstCell) {
      return { x1: 0, y1: 0, x2: 0, y2: 0 };
    }
    
    const cellRect = firstCell.getBoundingClientRect();
    const gridRect = this.grid.getBoundingClientRect();
    
    const actualCellSize = cellRect.width;
    const computedStyle = window.getComputedStyle(this.grid);
    const actualGap = parseFloat(computedStyle.gap) || 3;
    const gridPadding = parseFloat(computedStyle.padding) || 6;
    
    const cellWithGap = actualCellSize + actualGap;
    const halfCell = actualCellSize / 2;
    
    const coords = {
      x1: start[1] * cellWithGap + halfCell + gridPadding,
      y1: start[0] * cellWithGap + halfCell + gridPadding,
      x2: end[1] * cellWithGap + halfCell + gridPadding,
      y2: end[0] * cellWithGap + halfCell + gridPadding
    };
    
    return coords;
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

  getPlayerColor(player) {
    return player === 1 ? GAME_CONFIG.player1Color : GAME_CONFIG.player2Color;
  }

  render(cells, gameState, lines, turnMessage, isGameover, player1Name, player2Name) {
    this.updateBoard(cells, gameState);
    this.updateScores(gameState);
    this.updatePlayerHighlight(gameState.currentPlayer);
    this.updateTurnDisplay(turnMessage);
    this.drawLines(lines);
    
    if (isGameover) {
      // Determine winner
      let winner = null;
      if (gameState.score1 > gameState.score2) {
        winner = player1Name || "Player 1";
      } else if (gameState.score2 > gameState.score1) {
        winner = player2Name || "Player 2";
      }
      
      this.showGameOverModal(winner, gameState.score1, gameState.score2);
    }
  }
}

class UIManager {
  constructor() {
    this.lobbySection = document.getElementById("lobby");
    this.gameSection = document.getElementById("game");
    this.lobbyStatus = document.getElementById("lobby-status");
    this.roomInput = document.getElementById("room-id");
    this.playerNameInput = document.getElementById("player-name");
    this.gridSize = document.getElementById("grid-size")
  }

  showLobby() {
    this.lobbySection.style.display = "block";
    this.gameSection.style.display = "none";
  }

  getSelectedGridSize() {
    return parseInt(this.gridSize.value, 10);
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
    this.wsManager = new WebSocketManager("https://omo-production.up.railway.app/");
    this.uiManager = new UIManager();
    this.renderer = new GameRenderer(true); // PASS true TO ENABLE MODAL
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
    
    // Initialize modal events AFTER renderer is created
    this.renderer.initializeModalEvents(this);
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
      } else if (data.type === 'roomCreated') {
        this.handleRoomCreated(data);
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
    const gridSize = this.uiManager.getSelectedGridSize();
    
    this.wsManager.send({
      type: "createRoom",
      roomId,
      playerName,
      gridSize
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
    const selectedDifficultyBtn = document.querySelector('.difficulty-btn.selected');
    const difficulty = selectedDifficultyBtn ? selectedDifficultyBtn.dataset.difficulty : 'MEDIUM';

    const gridSize = this.uiManager.getSelectedGridSize();
    GAME_CONFIG.gridSize = gridSize;

    this.renderer.grid.innerHTML = "";

    this.patternDetector = new PatternDetector(gridSize);
    this.renderer.initializeGrid();
    this.renderer.initializeSVG();

    this.cells = this.createGridCells();

    this.singlePlayerGame = new SinglePlayerGame(
      new GameState(),
      this.patternDetector,
      this.renderer,
      this.cells
    );
    this.currentGameMode = "SINGLE_PLAYER";
    this.uiManager.showGame();
    this.singlePlayerGame.start(name, difficulty);
  }

  handleMultiplayerInit(data) {
    this.currentGameMode = "MULTIPLAYER";
    
    // Update grid size if provided
    if (data.gridSize) {
      this.configureGridSize(data.gridSize);
    }
    
    this.uiManager.showGame();
    this.multiplayerGame.start(data);
  }

  handleRoomCreated(data) {
    // Configure grid size for room creator
    if (data.gridSize) {
      this.configureGridSize(data.gridSize);
    }
    
    this.currentGameMode = "MULTIPLAYER_WAITING";
    this.uiManager.showGame();
    
    // Set up temporary display while waiting
    this.renderer.setPlayerNames("You (waiting...)", "Opponent (waiting...)");
    this.renderer.updateTurnDisplay(`Waiting for opponent to join room: ${data.roomId}`);
    this.renderer.updateScores({ score1: 0, score2: 0 });
    this.renderer.updatePlayerHighlight(1);
  }

  configureGridSize(gridSize) {
    GAME_CONFIG.gridSize = gridSize;
    
    // Clear and recreate grid
    this.renderer.grid.innerHTML = "";
    this.patternDetector = new PatternDetector(gridSize);
    this.renderer.initializeGrid();
    this.renderer.initializeSVG();
    
    // Recreate cells
    this.cells = this.createGridCells();
    
    // Update game instances with new cells and pattern detector
    if (this.multiplayerGame) {
      this.multiplayerGame.cells = this.cells;
      this.multiplayerGame.patternDetector = this.patternDetector;
    }
  }

  handleCellClick(cellIndex) {
    if (this.currentGameMode === "SINGLE_PLAYER") {
      this.singlePlayerGame.handlePlayerMove(cellIndex);
    } else if (this.currentGameMode === "MULTIPLAYER") {
      this.multiplayerGame.handleMove(cellIndex);
    }
    // Ignore clicks in MULTIPLAYER_WAITING mode
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