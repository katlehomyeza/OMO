const ws = new WebSocket("ws://localhost:8080");
let playerNumber = null;
let playerName= null;
let gameState = null;
let currentRoom = null;

const grid = document.getElementById('grid');
const gridSize = 6;
const cellSize = 60;
const gap = 5;
const svg = document.getElementById("line-overlay");
const turnDisplay = document.getElementById("turn-display");

grid.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
grid.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;

const totalWidth = gridSize * cellSize + (gridSize - 1) * gap;
const totalHeight = gridSize * cellSize + (gridSize - 1) * gap;
svg.setAttribute("width", totalWidth + 20);
svg.setAttribute("height", totalHeight + 20);
svg.style.left = "-10px";
svg.style.top = "-10px";

const score1Div = document.getElementById("score1");
const score2Div = document.getElementById("score2");
const playerLabel1 = document.getElementById("player1");
const playerLabel2 = document.getElementById("player2");
const player1Display = document.getElementById("player1-display");
const player2Display = document.getElementById("player2-display");
const createBtn = document.getElementById("create-btn");
const joinBtn = document.getElementById("join-btn");
const roomInput = document.getElementById("room-id");
const lobbyStatus = document.getElementById("lobby-status");
const playerNameInput = document.getElementById("player-name");

createBtn.addEventListener("click", () => {
  const roomId = roomInput.value.trim() || "ROOM" + Math.floor(Math.random() * 1000);
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    lobbyStatus.innerText = "❌ Please enter a valid player name!";
    playerNameInput.focus();
  } else if (playerName.length > 15) {
    lobbyStatus.innerText = "❌ Name too long! Max 15 characters.";
    playerNameInput.focus();
  } else {
    // Send create room request
    ws.send(JSON.stringify({ type: "createRoom", roomId, playerName }));
    lobbyStatus.innerText = `📢 Creating room: ${roomId} as ${playerName}...`;
  }
});


joinBtn.addEventListener("click", () => {
  const playerName = playerNameInput.value.trim();
  const roomId = roomInput.value.trim();
  if (!roomId) {
    lobbyStatus.innerText = "⚠️ Please enter a room code to join.";
    return;
  }
  ws.send(JSON.stringify({ type: "joinRoom", roomId, playerName }));
  lobbyStatus.innerText = `🔗 Joining room: ${roomId}...`;

});


const cells = [];

// Build grid buttons
for (let i = 0; i < gridSize * gridSize; i++) {
  const button = document.createElement('button');
  button.id = i;
  button.addEventListener('click', () => {
    if (!gameState || gameState.board[i] !== "" || gameState.currentPlayer !== playerNumber) return;

    const mark = playerNumber === 1 ? "O" : "M";

    ws.send(JSON.stringify({
      type: 'move',
      roomId: currentRoom,   // 🔑 send room with move
      cell: i,
      player: playerNumber,
      mark
    }));
  });
  grid.appendChild(button);
  cells.push(button);
}

// Handle messages from server
ws.onmessage = (msg) => {
  const data = JSON.parse(msg.data);

  if (data.type === 'full') {
    alert(`Room ${data.roomId} is full!`);
  }

  if (data.type === 'init') {
    playerNumber = data.player;
    playerName = data.playerName;
    currentRoom = data.roomId;
    gameState = data.gameState;
    renderBoard(data.lines || []);
    document.getElementById("lobby").style.display = "none";
    document.getElementById("game").style.display = "block";

    playerLabel1.innerText = data.player1Name || "Waiting...";
    playerLabel2.innerText = data.player2Name || "Waiting...";
  }

  if (data.type === 'update') {
    gameState = data.gameState;
    renderBoard(data.lines);
  }
};

// Render game state
function renderBoard(lines) {
  // Update marks
  gameState.board.forEach((mark, i) => cells[i].innerText = mark);

  // Update scores
  score1Div.innerText = gameState.score1;
  score2Div.innerText = gameState.score2;

  // Turn highlight
  if (gameState.currentPlayer === 1) {
    player1Display.classList.add('active');
    player2Display.classList.remove('active');
  } else {
    player2Display.classList.add('active');
    player1Display.classList.remove('active');
  }

  // Turn message
  if (gameState.currentPlayer === playerNumber) {
    turnDisplay.innerText = `Your turn! (${playerNumber === 1 ? "O" : "M"})`;
  } else {
    turnDisplay.innerText = "Opponent's turn";
  }

  // Draw OMO lines
  svg.innerHTML = "";
  lines.forEach(line => {
    const [start, , end] = line.cells;
    const offset = 10;
    const x1 = start[1] * (cellSize + gap) + cellSize / 2 + offset;
    const y1 = start[0] * (cellSize + gap) + cellSize / 2 + offset;
    const x2 = end[1] * (cellSize + gap) + cellSize / 2 + offset;
    const y2 = end[0] * (cellSize + gap) + cellSize / 2 + offset;

    const svgLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
    svgLine.setAttribute("x1", x1);
    svgLine.setAttribute("y1", y1);
    svgLine.setAttribute("x2", x2);
    svgLine.setAttribute("y2", y2);
    svgLine.setAttribute("stroke", line.player === 1 ? "#ff6b6b" : "#4ecdc4");
    svgLine.setAttribute("stroke-width", "5");
    svgLine.setAttribute("stroke-linecap", "round");
    svg.appendChild(svgLine);
  });
}

// End game button
const endGameBtn = document.getElementById("end-game-btn");
endGameBtn.addEventListener('click', () => {
  ws.send(JSON.stringify({ type: 'endGame', roomId: currentRoom }));
});