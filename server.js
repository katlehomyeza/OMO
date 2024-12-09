import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import path from 'path';
import { fileURLToPath } from 'url';


const app = express();
const server = createServer(app);
const io = new Server(server);

let board = Array(3).fill(" ").map(() => Array(3).fill(" "));
let scores = { player1: 0, player2: 0 };
let players = []

const __dirname = path.dirname(fileURLToPath(import.meta.url)); // Get the current directory
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});
console.log(__dirname)


// Socket.IO connection
io.on('connection', (socket) => {

     // Check if there is room for more players
     if (players.length >= 2) {
        socket.emit('gameFull', 'The game is already full.');
        console.log('Player rejected: game is full');
        socket.disconnect();
        return;
    }

    // Notify all players when the game is ready
    if (players.length === 2) {
        io.emit('gameReady', 'The game is starting!');
        io.emit('Players', {players:players});
        
    }

    socket.on('playerName',({playerName})=>{
        // Add player to the list and assign mark
        const playerMark = players.length === 0 ? 'O' : 'M';
        const player = { id: socket.id, mark: playerMark ,name:playerName};
        players.push(player);
        socket.emit('playerAssigned', { mark: playerMark, board, scores , ready:players.length === 2?true:false });
        console.log(players)

    })

     

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
            io.emit('moveMade', { row, col, mark, board, scores,nextTurn:mark ==='M'? 'O':'M' });


        }
       
    });

    socket.on('resetGame', () => {
        board = Array(3).fill(" ").map(() => Array(3).fill(" "));
        scores = { player1: 0, player2: 0 };
        io.emit('resetGame', { board, scores });
    });

    socket.on('disconnect', () => {
        console.log('A player disconnected:', socket.id);
        players = players.filter(player => player.id !== socket.id);
        console.log('Remaining players:', players);
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


