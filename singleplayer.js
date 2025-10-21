import { GameState } from "./gamestate.js";
import { GAME_CONFIG } from "./server.js";

const DIFFICULTY_LEVELS = {
  EASY: {
    name: "Easy",
    lookAhead: 0,
    randomness: 0.7,
    blockProbability: 0.3
  },
  MEDIUM: {
    name: "Medium",
    lookAhead: 1,
    randomness: 0.4,
    blockProbability: 0.6
  },
  HARD: {
    name: "Hard",
    lookAhead: 2,
    randomness: 0.2,
    blockProbability: 0.8
  },
  EXPERT: {
    name: "Expert",
    lookAhead: 3,
    randomness: 0,
    blockProbability: 1
  }
};

export class SinglePlayerGame {
  constructor(gameState, patternDetector, renderer, cells) {
    this.gameState = gameState;
    this.patternDetector = patternDetector;
    this.renderer = renderer;
    this.cells = cells;
    this.lines = [];
    this.playerNumber = null;
    this.playerName = null;
    this.aiName = null;
    this.difficulty = DIFFICULTY_LEVELS.MEDIUM;
  }

  setDifficulty(difficultyLevel) {
    this.difficulty = DIFFICULTY_LEVELS[difficultyLevel] || DIFFICULTY_LEVELS.MEDIUM;
  }

  start(name, difficulty = 'EXPERT') {
    this.playerNumber = Math.random() < 0.5 ? 1 : 2;
    this.playerName = name;
    this.aiName = `AI Bot (${this.difficulty.name})`;
    this.lines = [];
    this.setDifficulty(difficulty);
    
    this.gameState = new GameState();
    this.renderer.setPlayerNames(name, this.aiName);
    this.render();
  }

  handlePlayerMove(cellIndex) {
    if (!this.gameState.isValidMove(cellIndex, 1)) {
      return;
    }

    this.gameState.makeMove(cellIndex, GAME_CONFIG.player1Mark);
    const scoredOMO = this.checkAndUpdateOMO(1);
    
    if (this.gameState.isBoardFull()) {
      this.render(true);
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
      this.render(true);
      return;
    }

    const cellIndex = this.selectBestMove(emptyCells);

    this.gameState.makeMove(cellIndex, GAME_CONFIG.player2Mark);
    const scoredOMO = this.checkAndUpdateOMO(2);

    if (this.gameState.isBoardFull()) {
      this.render(true);
      return;
    }

    if (scoredOMO) {
      this.render();
      setTimeout(() => this.makeAIMove(), GAME_CONFIG.aiConsecutiveMoveDelay);
      return;
    }

    this.gameState.switchPlayer();
    this.render();
  }

  selectBestMove(emptyCells) {
    if (Math.random() < this.difficulty.randomness) {
      return this.getRandomMove(emptyCells);
    }

    const winningMove = this.findWinningMove(emptyCells);
    if (winningMove !== null) {
      return winningMove;
    }

    if (Math.random() < this.difficulty.blockProbability) {
      const blockingMove = this.findBlockingMove(emptyCells);
      if (blockingMove !== null) {
        return blockingMove;
      }
    }

    const strategicMove = this.findStrategicMove(emptyCells);
    if (strategicMove !== null) {
      return strategicMove;
    }

    return this.getRandomMove(emptyCells);
  }

  getRandomMove(emptyCells) {
    const randomIndex = Math.floor(Math.random() * emptyCells.length);
    return emptyCells[randomIndex];
  }

  findWinningMove(emptyCells) {
    for (const cellIndex of emptyCells) {
      const testBoard = [...this.gameState.board];
      testBoard[cellIndex] = GAME_CONFIG.player2Mark;
      
      const wouldScore = this.wouldScoreOMO(testBoard, cellIndex, GAME_CONFIG.player2Mark);
      if (wouldScore) {
        return cellIndex;
      }
    }
    return null;
  }

  findBlockingMove(emptyCells) {
    for (const cellIndex of emptyCells) {
      const testBoard = [...this.gameState.board];
      testBoard[cellIndex] = GAME_CONFIG.player1Mark;
      
      const opponentWouldScore = this.wouldScoreOMO(testBoard, cellIndex, GAME_CONFIG.player1Mark);
      if (opponentWouldScore) {
        return cellIndex;
      }
    }
    return null;
  }

  findStrategicMove(emptyCells) {
    const moveScores = emptyCells.map(cellIndex => ({
      cellIndex,
      score: this.evaluateMoveStrength(cellIndex)
    }));

    moveScores.sort((a, b) => b.score - a.score);
    
    const topMoves = moveScores.filter(move => 
      move.score === moveScores[0].score
    );

    if (topMoves.length === 0) {
      return null;
    }

    const randomTopMove = topMoves[Math.floor(Math.random() * topMoves.length)];
    return randomTopMove.cellIndex;
  }

  evaluateMoveStrength(cellIndex) {
    let score = 0;
    const patterns = this.patternDetector.patterns;

    for (const pattern of patterns) {
      if (!pattern.includes(cellIndex)) {
        continue;
      }

      const marks = pattern.map(idx => {
        if (idx === cellIndex) {
          return GAME_CONFIG.player2Mark;
        }
        return this.gameState.board[idx];
      });

      const oCount = marks.filter(m => m === GAME_CONFIG.player1Mark).length;
      const mCount = marks.filter(m => m === GAME_CONFIG.player2Mark).length;
      const emptyCount = marks.filter(m => m === "").length;

      if (oCount === 2 && mCount === 0 && emptyCount === 1) {
        score += 10;
      }

      if (oCount === 1 && mCount === 1 && emptyCount === 1) {
        score += 5;
      }

      if (oCount === 2 && mCount === 1) {
        score += 15;
      }

      if (oCount === 0 && mCount === 2 && emptyCount === 1) {
        score += 3;
      }
    }

    score += this.evaluatePositionValue(cellIndex);

    return score;
  }

  evaluatePositionValue(cellIndex) {
    const row = Math.floor(cellIndex / GAME_CONFIG.gridSize);
    const col = cellIndex % GAME_CONFIG.gridSize;
    const center = GAME_CONFIG.gridSize / 2;

    const distanceFromCenter = Math.abs(row - center) + Math.abs(col - center);
    return Math.max(0, 5 - distanceFromCenter);
  }

  wouldScoreOMO(testBoard, lastMove, mark) {
    const patterns = this.patternDetector.patterns;

    for (const pattern of patterns) {
      if (!pattern.includes(lastMove)) {
        continue;
      }

      const marks = pattern.map(idx => testBoard[idx]);
      
      if (marks[0] === GAME_CONFIG.player1Mark && 
          marks[1] === GAME_CONFIG.player2Mark && 
          marks[2] === GAME_CONFIG.player1Mark) {
        
        const lineExists = this.lines.some(line => 
          JSON.stringify(line.cells.map(c => c[2])) === JSON.stringify(pattern)
        );
        
        if (!lineExists) {
          return true;
        }
      }
    }

    return false;
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

  render(isGameOver = false) {
    this.renderer.render(
      this.cells, 
      this.gameState, 
      this.lines, 
      this.getTurnMessage(), 
      isGameOver,
      this.playerName,
      this.aiName
    );
  }
}