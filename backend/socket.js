import WebSocket, { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 8080 });

let players = [];
let gridSize = 6;

let gameState = {
  board: Array(gridSize * gridSize).fill(""),
  currentPlayer: 1,
  score1: 0,
  score2: 0,
  countedOMOs1: [],
  countedOMOs2: [],
  allLines: [] // Store all lines persistently
};

// Helper to detect OMOs and update scores
function detectOMO() {
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
      
      // Check if this OMO has already been counted
      if (countedOMOs1.has(key)) {
        player = 1;
      } else if (countedOMOs2.has(key)) {
        player = 2;
      } else {
        // New OMO - award to the player who just completed it (current player before switch)
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
      const line = checkCells([[i,j],[i,j+1],[i,j+2]]);
      if (line) lines.push(line);
    }
  }

  // Columns
  for (let j = 0; j < gridSize; j++) {
    for (let i = 0; i <= gridSize - 3; i++) {
      const line = checkCells([[i,j],[i+1,j],[i+2,j]]);
      if (line) lines.push(line);
    }
  }

  // Diagonals TL-BR
  for (let i = 0; i <= gridSize - 3; i++) {
    for (let j = 0; j <= gridSize - 3; j++) {
      const line = checkCells([[i,j],[i+1,j+1],[i+2,j+2]]);
      if (line) lines.push(line);
    }
  }

  // Diagonals TR-BL
  for (let i = 0; i <= gridSize - 3; i++) {
    for (let j = 2; j < gridSize; j++) {
      const line = checkCells([[i,j],[i+1,j-1],[i+2,j-2]]);
      if (line) lines.push(line);
    }
  }

  gameState.countedOMOs1 = Array.from(countedOMOs1);
  gameState.countedOMOs2 = Array.from(countedOMOs2);
  gameState.allLines = lines; // Store all lines in game state

  const newCountedTotal = countedOMOs1.size + countedOMOs2.size;
  const newOMOsCreated = newCountedTotal - previousCountedTotal;

  return { lines, newOMOsCreated };
}

wss.on('connection', (ws) => {
  if (players.length >= 2) {
    ws.send(JSON.stringify({ type: 'full' }));
    ws.close();
    return;
  }

  const playerNumber = players.length + 1;
  players.push(ws);

  ws.send(JSON.stringify({ type: 'init', player: playerNumber, gameState, lines: gameState.allLines }));

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.type === 'move') {
      if (gameState.board[msg.cell] === "" && gameState.currentPlayer === msg.player) {
        gameState.board[msg.cell] = msg.mark;

        const { lines, newOMOsCreated } = detectOMO(); // update scores and get all lines

        // If no new OMO was created, switch to the other player
        if (newOMOsCreated === 0) {
          gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
        }
        // If OMO was created, current player stays the same (plays again)

        // Broadcast updated state + ALL lines to all players
        players.forEach(p => {
          if (p.readyState === WebSocket.OPEN) {
            p.send(JSON.stringify({ type: 'update', gameState, lines }));
          }
        });
      }
    }
    if (msg.type === 'endGame') {
      // Reset game state
      gameState.board = Array(gridSize * gridSize).fill("");
      gameState.currentPlayer = 1;
      gameState.score1 = 0;
      gameState.score2 = 0;
      gameState.countedOMOs1 = [];
      gameState.countedOMOs2 = [];
      gameState.allLines = [];

      // Notify all players
      players.forEach(p => {
        if (p.readyState === WebSocket.OPEN) {
          p.send(JSON.stringify({ type: 'update', gameState, lines: [] }));
        }
      });
    }
  });

  ws.on('close', () => {
    players = players.filter(p => p !== ws);
    // Optional: reset game
  });
});

console.log('WebSocket server running on ws://localhost:8080');