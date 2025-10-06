import { GAME_CONFIG } from "./server.js";
export class PatternDetector {
  constructor(gridSize) {
    this.gridSize = gridSize;
    this.patterns = this.generateAllPatterns();
  }

  generateAllPatterns() {
    return [
      ...this.generateRowPatterns(),
      ...this.generateColumnPatterns(),
      ...this.generateDiagonalPatterns()
    ];
  }

  generateRowPatterns() {
    const patterns = [];
    for (let row = 0; row < this.gridSize; row++) {
      for (let col = 0; col < this.gridSize - 2; col++) {
        patterns.push([
          row * this.gridSize + col,
          row * this.gridSize + col + 1,
          row * this.gridSize + col + 2
        ]);
      }
    }
    return patterns;
  }

  generateColumnPatterns() {
    const patterns = [];
    for (let col = 0; col < this.gridSize; col++) {
      for (let row = 0; row < this.gridSize - 2; row++) {
        patterns.push([
          row * this.gridSize + col,
          (row + 1) * this.gridSize + col,
          (row + 2) * this.gridSize + col
        ]);
      }
    }
    return patterns;
  }

  generateDiagonalPatterns() {
    return [
      ...this.generateDownRightDiagonals(),
      ...this.generateDownLeftDiagonals()
    ];
  }

  generateDownRightDiagonals() {
    const patterns = [];
    for (let row = 0; row < this.gridSize - 2; row++) {
      for (let col = 0; col < this.gridSize - 2; col++) {
        patterns.push([
          row * this.gridSize + col,
          (row + 1) * this.gridSize + col + 1,
          (row + 2) * this.gridSize + col + 2
        ]);
      }
    }
    return patterns;
  }

  generateDownLeftDiagonals() {
    const patterns = [];
    for (let row = 0; row < this.gridSize - 2; row++) {
      for (let col = 2; col < this.gridSize; col++) {
        patterns.push([
          row * this.gridSize + col,
          (row + 1) * this.gridSize + col - 1,
          (row + 2) * this.gridSize + col - 2
        ]);
      }
    }
    return patterns;
  }

  findOMOPatterns(board, existingLines, currentPlayer) {
    const newLines = [];
    
    for (const pattern of this.patterns) {
      if (this.isOMOPattern(board, pattern) && !this.lineExists(pattern, existingLines)) {
        newLines.push({
          cells: pattern.map(index => this.indexToCoordinates(index)),
          player: currentPlayer
        });
      }
    }
    
    return newLines;
  }

  isOMOPattern(board, pattern) {
    const [first, second, third] = pattern;
    return board[first] === GAME_CONFIG.player1Mark && 
           board[second] === GAME_CONFIG.player2Mark && 
           board[third] === GAME_CONFIG.player1Mark;
  }

  lineExists(pattern, lines) {
    const patternString = JSON.stringify(pattern);
    return lines.some(line => 
      JSON.stringify(line.cells.map(cell => cell[2])) === patternString
    );
  }

  determinePatternPlayer(pattern, existingLines, newLines) {
    return 1;
  }

  indexToCoordinates(index) {
    const row = Math.floor(index / this.gridSize);
    const col = index % this.gridSize;
    return [row, col, index];
  }
}