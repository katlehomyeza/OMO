import WebSocket, { WebSocketServer } from "ws";

const wss = new WebSocketServer({ port: 8080 });

// Store multiple rooms
let rooms = {}; // { roomId: { players: [], gameState: {}, gridSize: number } }

// Create a fresh game state
function createGameState(gridSize) {
  return {
    board: Array(gridSize * gridSize).fill(""),
    currentPlayer: 1,
    score1: 0,
    score2: 0,
    countedOMOs1: [],
    countedOMOs2: [],
    allLines: []
  };
}

// Detect OMO logic
function detectOMO(gameState, gridSize) {
  const board = [];
  for (let i = 0; i < gridSize; i++) {
    board.push([]);
    for (let j = 0; j < gridSize; j++) {
      board[i][j] = gameState.board[i * gridSize + j];
    }
  }

  const countedOMOs1 = new Set(gameState.countedOMOs1);
  const countedOMOs2 = new Set(gameState.countedOMOs2);
  const previousCountedTotal = countedOMOs1.size + countedOMOs2.size;

  const incrementScore = (player) => {
    if (player === 1) gameState.score1++;
    else gameState.score2++;
  };

  const checkCells = (cells) => {
    const [r1, c1] = cells[0];
    const [r2, c2] = cells[1];
    const [r3, c3] = cells[2];

    if (board[r1][c1] === "O" && board[r2][c2] === "M" && board[r3][c3] === "O") {
      const key = `${r1},${c1}-${r2},${c2}-${r3},${c3}`;
      let player;

      if (countedOMOs1.has(key)) {
        player = 1;
      } else if (countedOMOs2.has(key)) {
        player = 2;
      } else {
        player = gameState.currentPlayer;
        incrementScore(player);
        if (player === 1) countedOMOs1.add(key);
        else countedOMOs2.add(key);
      }

      return { cells, player };
    }
    return null;
  };

  const lines = [];

  // Rows
  for (let i = 0; i < gridSize; i++) {
    for (let j = 0; j <= gridSize - 3; j++) {
      const line = checkCells([[i, j], [i, j + 1], [i, j + 2]]);
      if (line) lines.push(line);
    }
  }

  // Columns
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i <= gridSize - 3; i++) {
      const line = checkCells([[i, j], [i + 1, j], [i + 2, j]]);
      if (line) lines.push(line);
    }
  }

  // Diagonals TL-BR
  for (let i = 0; i <= gridSize - 3; i++) {
    for (let j = 0; j <= gridSize - 3; j++) {
      const line = checkCells([[i, j], [i + 1, j + 1], [i + 2, j + 2]]);
      if (line) lines.push(line);
    }
  }

  // Diagonals TR-BL
  for (let i = 0; i <= gridSize - 3; i++) {
    for (let j = 2; j < gridSize; j++) {
      const line = checkCells([[i, j], [i + 1, j - 1], [i + 2, j - 2]]);
      if (line) lines.push(line);
    }
  }

  gameState.countedOMOs1 = Array.from(countedOMOs1);
  gameState.countedOMOs2 = Array.from(countedOMOs2);
  gameState.allLines = lines;

  const newCountedTotal = countedOMOs1.size + countedOMOs2.size;
  const newOMOsCreated = newCountedTotal - previousCountedTotal;

  return { lines, newOMOsCreated };
}

wss.on("connection", (ws) => {
  const messageCounts = new Map();
  ws.on("message", (data) => {
    const count = messageCounts.get(ws) || 0;
    if (count > 1000) { 
      ws.close();
      return;
    }
    messageCounts.set(ws, count + 1);
    const msg = JSON.parse(data);

    // -------------------
    // CREATE ROOM
    if (msg.type === "createRoom") {
      if (rooms[msg.roomId]) {
        ws.send(JSON.stringify({ type: "error", message: "Room already exists" }));
        return;
      }

      const gridSize = msg.gridSize || 6; // Use provided grid size or default to 6

      rooms[msg.roomId] = {
        players: [ws],
        playerNames: [msg.playerName, null],
        gameState: createGameState(gridSize),
        gridSize: gridSize
      };

      ws.roomId = msg.roomId;
      ws.playerNumber = 1;
      ws.playerName = msg.playerName;

      ws.send(JSON.stringify({ 
        type: "roomCreated", 
        roomId: msg.roomId,
        gridSize: gridSize
      }));
      console.log(`Room ${msg.roomId} created by ${msg.playerName} with grid size ${gridSize}`);
      return;
    }

    // -------------------
    // JOIN ROOM
    if (msg.type === "joinRoom") {
      const room = rooms[msg.roomId];
      if (!room) {
        ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
        return;
      }
      if (room.players.length >= 2) {
        ws.send(JSON.stringify({ type: "full", roomId: msg.roomId }));
        return;
      }
      room.playerNames[1] = msg.playerName;
      room.players.push(ws);
      ws.roomId = msg.roomId;
      ws.playerNumber = 2;
      ws.playerName = msg.playerName;

      // Notify both players with init
      room.players.forEach((player, idx) => {
        if (player.readyState === WebSocket.OPEN) {
          player.send(JSON.stringify({
            type: "init",
            player: idx + 1,
            roomId: msg.roomId,
            gameState: room.gameState,
            lines: room.gameState.allLines,
            playerName: msg.playerName,
            player1Name: room.playerNames[0],
            player2Name: room.playerNames[1],
            gridSize: room.gridSize
          }));
        }
      });
      console.log(`${msg.playerName} joined room ${msg.roomId}`);
      return;
    }

    // -------------------
    // MOVE
    if (msg.type === "move") {
      const room = rooms[ws.roomId];
      if (!room) return;

      let gs = room.gameState;
      if (gs.board[msg.cell] === "" && gs.currentPlayer === msg.player) {
        gs.board[msg.cell] = msg.mark;

        const { lines, newOMOsCreated } = detectOMO(gs, room.gridSize);

        if (newOMOsCreated === 0) {
          gs.currentPlayer = gs.currentPlayer === 1 ? 2 : 1;
        }

        // Check if board is full
        const isBoardFull = gs.board.every(cell => cell !== "");

        // Broadcast update
        room.players.forEach(p => {
          if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ 
              type: "update", 
              gameState: gs, 
              lines,
              isGameOver: isBoardFull
            }));
          }
        });
      }
      return;
    }

    // -------------------
    // END GAME
    if (msg.type === "endGame") {
      const room = rooms[ws.roomId];
      if (!room) return;

      room.gameState = createGameState(room.gridSize);

      room.players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ 
            type: "update", 
            gameState: room.gameState, 
            lines: [],
            isGameOver: false
          }));
        }
      });
      return;
    }
  });

  ws.on("close", () => {
    const room = rooms[ws.roomId];
    if (!room) return;

    room.players = room.players.filter(p => p !== ws);

    if (room.players.length === 0) {
      delete rooms[ws.roomId];
      console.log(`Room ${ws.roomId} deleted`);
    }
  });
});

console.log("✅ WebSocket server running on ws://localhost:8080");