import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const server = createServer(app);
const io = new Server(server);

let board = Array(3).fill(" ").map(() => Array(3).fill(" "));
let scores = { player1: 0, player2: 0 };

app.use((__dirname)); // Serve the HTML file

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Send the initial state
    socket.emit('init', { board, scores });

    socket.on('playerMove', ({ row, col, mark }) => {
        if (board[row][col] === " ") { // Only accept valid moves
            board[row][col] = mark;

            // Check for "OMO"
            const omoCount = checkOMO(row, col, mark);
            const currentPlayer = mark === 'M' ? 'player1' : 'player2';
            scores[currentPlayer] += omoCount;

            // Broadcast the move and updated scores
            io.emit('moveMade', { row, col, mark, board, scores });
        }
    });

    socket.on('resetGame', () => {
        board = Array(3).fill(" ").map(() => Array(3).fill(" "));
        scores = { player1: 0, player2: 0 };
        io.emit('resetGame', { board, scores });
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);
    });
});

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});

// OMO Check Logic
function checkOMO(row, col, mark) {
    const opponentMark = mark === 'M' ? 'O' : 'M';
    let omoCount = 0;

    // Check row
    if (checkLine(board[row], opponentMark)) omoCount++;

    // Check column
    const column = board.map(r => r[col]);
    if (checkLine(column, opponentMark)) omoCount++;

    // Check main diagonal
    if (row === col) {
        const mainDiagonal = board.map((r, i) => r[i]);
        if (checkLine(mainDiagonal, opponentMark)) omoCount++;
    }

    // Check anti-diagonal
    if (row + col === board.length - 1) {
        const antiDiagonal = board.map((r, i) => r[board.length - i - 1]);
        if (checkLine(antiDiagonal, opponentMark)) omoCount++;
    }

    return omoCount;
}

function checkLine(line, opponentMark) {
    return line.join('').trim().includes('OMO');
}
