    const grid = document.getElementById('grid');
    const gridSize = 6; // Change this to any size (3, 5, 9, etc.)
    let currentPlayer = 1;
    let currentMark = "O";

    let score1 = 0;
    let score2 = 0;
    const score1Div = document.getElementById("score1");
    const score2Div = document.getElementById("score2");
    const player1Display = document.getElementById("player1-display");
    const player2Display = document.getElementById("player2-display");
    
    const countedOMOs1 = new Set();
    const countedOMOs2 = new Set();

    // Calculate cell and gap sizes
    const cellSize = 60;
    const gap = 5;
    
    // Set up dynamic grid
    grid.style.gridTemplateColumns = `repeat(${gridSize}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${gridSize}, ${cellSize}px)`;
    
    // Set up SVG overlay size
    const svgSize = gridSize * cellSize + (gridSize - 1) * gap;
    const svg = document.getElementById("line-overlay");
    svg.setAttribute("width", svgSize);
    svg.setAttribute("height", svgSize);

    function incrementScore(player) {
      if (player === 1) {
        score1++;
        score1Div.innerText = score1;
      } else {
        score2++;
        score2Div.innerText = score2;
      }
    }

    function updateActivePlayer() {
      if (currentPlayer === 1) {
        player1Display.classList.add('active');
        player2Display.classList.remove('active');
      } else {
        player2Display.classList.add('active');
        player1Display.classList.remove('active');
      }
    }

    // Create grid buttons
    for (let i = 0; i < gridSize * gridSize; i++) {
      const button = document.createElement('button');
      button.id = i;
      button.innerText = "";
      button.addEventListener('click', () => {
        if (button.innerText !== "") return;

        button.innerText = currentMark;
        
        currentPlayer = currentPlayer === 1 ? 2 : 1;
        currentMark = currentMark === "O" ? "M" : "O";
        
        updateActivePlayer();
        detectOMO();
      });
      grid.appendChild(button);
    }

    const detectOMO = () => {
      const board = [];
      for (let i = 0; i < gridSize; i++) {
        board.push([]);
        for (let j = 0; j < gridSize; j++) {
          board[i][j] = document.getElementById(i * gridSize + j).innerText;
        }
      }

      svg.innerHTML = "";

      const drawLine = (cells, key, player) => {
        const [r1, c1] = cells[0];
        const [r3, c3] = cells[2];

        const x1 = c1 * (cellSize + gap) + cellSize / 2;
        const y1 = r1 * (cellSize + gap) + cellSize / 2;
        const x2 = c3 * (cellSize + gap) + cellSize / 2;
        const y2 = r3 * (cellSize + gap) + cellSize / 2;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", player === 1 ? "#ff6b6b" : "#4ecdc4");
        line.setAttribute("stroke-width", "5");
        line.setAttribute("stroke-linecap", "round");

        svg.appendChild(line);

        const countedSet = player === 1 ? countedOMOs1 : countedOMOs2;
        const fullKey = `${player}-${key}`;
        
        if (!countedSet.has(fullKey)) {
          countedSet.add(fullKey);
          incrementScore(player);
        }
      };

      // Check rows
      for (let i = 0; i < gridSize; i++) {
        for (let j = 0; j <= gridSize - 3; j++) {
          if (board[i][j] === "O" && board[i][j+1] === "M" && board[i][j+2] === "O") {
            const key = `row-${i}-${j}`;
            const player = countedOMOs1.has(`1-${key}`) ? 1 : countedOMOs2.has(`2-${key}`) ? 2 : currentPlayer === 1 ? 2 : 1;
            drawLine([[i,j],[i,j+1],[i,j+2]], key, player);
          }
        }
      }
      
      // Check cols
      for (let j = 0; j < gridSize; j++) {
        for (let i = 0; i <= gridSize - 3; i++) {
          if (board[i][j] === "O" && board[i+1][j] === "M" && board[i+2][j] === "O") {
            const key = `col-${j}-${i}`;
            const player = countedOMOs1.has(`1-${key}`) ? 1 : countedOMOs2.has(`2-${key}`) ? 2 : currentPlayer === 1 ? 2 : 1;
            drawLine([[i,j],[i+1,j],[i+2,j]], key, player);
          }
        }
      }
      
      // Check diagonals (top-left to bottom-right)
      for (let i = 0; i <= gridSize - 3; i++) {
        for (let j = 0; j <= gridSize - 3; j++) {
          if (board[i][j] === "O" && board[i+1][j+1] === "M" && board[i+2][j+2] === "O") {
            const key = `diag-main-${i}-${j}`;
            const player = countedOMOs1.has(`1-${key}`) ? 1 : countedOMOs2.has(`2-${key}`) ? 2 : currentPlayer === 1 ? 2 : 1;
            drawLine([[i,j],[i+1,j+1],[i+2,j+2]], key, player);
          }
        }
      }
      
      // Check diagonals (top-right to bottom-left)
      for (let i = 0; i <= gridSize - 3; i++) {
        for (let j = 2; j < gridSize; j++) {
          if (board[i][j] === "O" && board[i+1][j-1] === "M" && board[i+2][j-2] === "O") {
            const key = `diag-anti-${i}-${j}`;
            const player = countedOMOs1.has(`1-${key}`) ? 1 : countedOMOs2.has(`2-${key}`) ? 2 : currentPlayer === 1 ? 2 : 1;
            drawLine([[i,j],[i+1,j-1],[i+2,j-2]], key, player);
          }
        }
      }
    };

    updateActivePlayer();
