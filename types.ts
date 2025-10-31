
export interface Player {
  id: string;
  name: string;
  status: 'online' | 'playing';
}

export interface Game {
  id: string;
  board: (string | null)[];
  players: {
    X: string;
    O: string;
  };
  turn: 'X' | 'O';
  winner: 'X' | 'O' | 'draw' | null;
  opponentName: string;
  playerSymbol: 'X' | 'O';
}

// Events from server to client
export interface ServerToClientEvents {
  loginSuccess: (player: Player) => void;
  loginError: (message: string) => void;
  updatePlayerList: (players: Player[]) => void;
  playRequest: (fromPlayer: Player) => void;
  requestWithdrawn: (fromPlayerId: string) => void;
  gameStart: (game: Game) => void;
  gameUpdate: (game: Game) => void;
  chatMessage: (message: { from: string; text: string }) => void;
  opponentLeft: () => void;
  error: (message: string) => void;
}

// Events from client to server
export interface ClientToServerEvents {
  setPin: (pin: string) => void;
  playRequest: (toPlayerId: string) => void;
  withdrawRequest: (toPlayerId: string) => void;
  acceptRequest: (fromPlayerId: string) => void;
  declineRequest: (fromPlayerId: string) => void;
  move: (index: number) => void;
  chatMessage: (text: string) => void;
  newGameRequest: () => void;
  leaveRoom: () => void;
}
