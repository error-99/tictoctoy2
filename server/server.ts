
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
// FIX: import fileURLToPath to derive __dirname
import { fileURLToPath } from 'url';
import usersData from './users.json';
import type { ClientToServerEvents, ServerToClientEvents, Player, Game } from './types';

// --- INITIAL SETUP ---
const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// FIX: __dirname is not defined in ES module scope. This is the standard workaround.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the parent directory (root of the project)
app.use(express.static(path.join(__dirname, '../')));
// FIX: Replaced '*' with a regex to solve "No overload matches this call" TypeScript error.
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});


// --- SERVER STATE ---
interface InternalPlayer extends Player {
    room?: string;
}
interface GameState {
    id: string;
    board: (string | null)[];
    players: { X: string; O: string; }; // socket.ids
    turn: 'X' | 'O';
    winner: 'X' | 'O' | 'draw' | null;
}

const pinInUse = new Map<string, string>(); // pin -> socket.id
const socketToPin = new Map<string, string>(); // socket.id -> pin
const players = new Map<string, InternalPlayer>();
const games = new Map<string, GameState>();


// --- HELPER FUNCTIONS ---
const getPublicPlayerList = (): Player[] => {
    return Array.from(players.values()).map(({ id, name, status }) => ({ id, name, status }));
};

const broadcastPlayerList = () => {
    io.emit('updatePlayerList', getPublicPlayerList());
};

const checkWin = (board: (string | null)[]): 'X' | 'O' | 'draw' | null => {
    const winningCombinations = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6]             // Diagonals
    ];

    for (const combo of winningCombinations) {
        const [a, b, c] = combo;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a] as 'X' | 'O';
        }
    }

    if (board.every(cell => cell !== null)) {
        return 'draw';
    }

    return null;
};

const cleanupAfterGame = (roomId: string) => {
    const game = games.get(roomId);
    if (!game) return;

    const playerX = players.get(game.players.X);
    const playerO = players.get(game.players.O);

    if (playerX) {
        playerX.status = 'online';
        delete playerX.room;
    }
    if (playerO) {
        playerO.status = 'online';
        delete playerO.room;
    }
    
    games.delete(roomId);
    broadcastPlayerList();
};

const createGameDataForPlayer = (game: GameState, currentPlayerId: string): Game => {
    const isPlayerX = game.players.X === currentPlayerId;
    const opponentId = isPlayerX ? game.players.O : game.players.X;
    const opponent = players.get(opponentId);

    return {
        id: game.id,
        board: game.board,
        players: game.players,
        turn: game.turn,
        winner: game.winner,
        playerSymbol: isPlayerX ? 'X' : 'O',
        opponentName: opponent?.name ?? 'Opponent',
    };
};

// --- SOCKET.IO CONNECTION LOGIC ---
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('setPin', (pin) => {
        const pinUsers = usersData as Record<string, string>;
        if (!pinUsers[pin]) {
            return socket.emit('loginError', 'Invalid PIN.');
        }
        if (pinInUse.has(pin)) {
            return socket.emit('loginError', 'This PIN is already in use.');
        }

        const name = pinUsers[pin];
        pinInUse.set(pin, socket.id);
        socketToPin.set(socket.id, pin);

        const newPlayer: InternalPlayer = { id: socket.id, name, status: 'online' };
        players.set(socket.id, newPlayer);

        socket.emit('loginSuccess', newPlayer);
        broadcastPlayerList();
        console.log(`Player ${name} (${socket.id}) logged in.`);
    });
    
    socket.on('playRequest', (toPlayerId) => {
        const fromPlayer = players.get(socket.id);
        if (fromPlayer) {
            socket.to(toPlayerId).emit('playRequest', { id: fromPlayer.id, name: fromPlayer.name, status: 'online' });
        }
    });

    socket.on('withdrawRequest', (toPlayerId) => {
        socket.to(toPlayerId).emit('requestWithdrawn', socket.id);
    });

    socket.on('acceptRequest', (fromPlayerId) => {
        const p1 = players.get(socket.id);
        const p2 = players.get(fromPlayerId);

        if (!p1 || !p2 || p1.status !== 'online' || p2.status !== 'online') {
            socket.emit('error', 'Player is no longer available.');
            io.to(fromPlayerId).emit('error', 'Opponent is no longer available.');
            return;
        }

        const roomId = `game-${socket.id}-${fromPlayerId}`;
        p1.status = 'playing';
        p1.room = roomId;
        p2.status = 'playing';
        p2.room = roomId;

        // FIX: The original symbol assignment caused a TypeScript error because the tuple type was too restrictive.
        // This refactored logic is type-safe and achieves the same random player assignment.
        const playersMap = Math.random() < 0.5
            ? { X: p1.id, O: p2.id }
            : { X: p2.id, O: p1.id };

        const newGame: GameState = {
            id: roomId,
            board: Array(9).fill(null),
            players: playersMap,
            turn: 'X',
            winner: null,
        };
        games.set(roomId, newGame);
        
        socket.join(roomId);
        io.sockets.sockets.get(fromPlayerId)?.join(roomId);
        
        io.to(p1.id).emit('gameStart', createGameDataForPlayer(newGame, p1.id));
        io.to(p2.id).emit('gameStart', createGameDataForPlayer(newGame, p2.id));

        broadcastPlayerList();
    });

    socket.on('move', (index) => {
        const player = players.get(socket.id);
        const roomId = player?.room;
        if (!roomId) return;
        const game = games.get(roomId);
        if (!game) return;

        const playerSymbol = game.players.X === socket.id ? 'X' : 'O';
        if (game.turn !== playerSymbol || game.board[index] || game.winner) return;

        game.board[index] = playerSymbol;
        const winner = checkWin(game.board);
        if (winner) {
            game.winner = winner;
        } else {
            game.turn = game.turn === 'X' ? 'O' : 'X';
        }
        
        io.to(game.players.X).emit('gameUpdate', createGameDataForPlayer(game, game.players.X));
        io.to(game.players.O).emit('gameUpdate', createGameDataForPlayer(game, game.players.O));
    });

    socket.on('chatMessage', (text) => {
        const player = players.get(socket.id);
        if (player?.room) {
            socket.to(player.room).emit('chatMessage', { from: player.name, text });
        }
    });

    socket.on('newGameRequest', () => {
        const player = players.get(socket.id);
        const roomId = player?.room;
        if (!roomId) return;
        const game = games.get(roomId);
        if (!game || !game.winner) return;

        game.board = Array(9).fill(null);
        game.winner = null;
        game.turn = Math.random() < 0.5 ? 'X' : 'O';
        
        io.to(game.players.X).emit('gameUpdate', createGameDataForPlayer(game, game.players.X));
        io.to(game.players.O).emit('gameUpdate', createGameDataForPlayer(game, game.players.O));
    });

    socket.on('leaveRoom', () => {
        const player = players.get(socket.id);
        const roomId = player?.room;
        if (!roomId) return;
        const game = games.get(roomId);

        if (game) {
            const opponentId = game.players.X === socket.id ? game.players.O : game.players.X;
            io.to(opponentId).emit('opponentLeft');
            io.sockets.sockets.get(opponentId)?.leave(roomId);
            cleanupAfterGame(roomId);
        }
        socket.leave(roomId);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        const player = players.get(socket.id);
        const pin = socketToPin.get(socket.id);
        const roomId = player?.room;
        
        if (roomId) {
            const game = games.get(roomId);
            if(game) {
                const opponentId = game.players.X === socket.id ? game.players.O : game.players.X;
                io.to(opponentId).emit('opponentLeft');
                cleanupAfterGame(roomId);
            }
        }

        if (pin) pinInUse.delete(pin);
        socketToPin.delete(socket.id);
        players.delete(socket.id);
        
        broadcastPlayerList();
    });
});

// --- START SERVER ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));