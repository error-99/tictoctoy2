
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import type { Socket } from 'socket.io-client';
import type { Player, Game, ServerToClientEvents, ClientToServerEvents } from './types';
import LoginScreen from './components/LoginScreen';
import LobbyScreen from './components/LobbyScreen';
import GameScreen from './components/GameScreen';

// In a real app, this would be in an environment variable.
// It assumes the backend server is running on localhost:3000.
const SOCKET_URL = 'http://localhost:3000';

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  
  // Global State
  const [view, setView] = useState<'login' | 'lobby' | 'game'>('login');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [game, setGame] = useState<Game | null>(null);
  
  // Request State
  const [incomingRequest, setIncomingRequest] = useState<Player | null>(null);
  const [sentRequestTo, setSentRequestTo] = useState<Player | null>(null);

  useEffect(() => {
    // The 'io' function is globally available from the script tag in index.html
    const socketIo = (window as any).io;
    const newSocket: Socket<ServerToClientEvents, ClientToServerEvents> = socketIo(SOCKET_URL, {
      reconnectionAttempts: 5,
    });
    setSocket(newSocket);
    
    return () => {
        newSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const onConnect = () => {
      console.log('Connected to server.');
      // If a user was logged in before a disconnect, they need to log in again.
      if (currentPlayer) {
        setView('login');
        setCurrentPlayer(null);
        setGame(null);
        setPlayers([]);
        setLoginError('You were disconnected. Please log in again.');
      }
    };

    const onLoginSuccess = (player: Player) => {
        setIsConnecting(false);
        setCurrentPlayer(player);
        setView('lobby');
        setLoginError(null);
    };
    const onLoginError = (message: string) => {
      setIsConnecting(false);
      setLoginError(message);
    };
    const onUpdatePlayerList = (playerList: Player[]) => {
      setPlayers(playerList);
      if (sentRequestTo && !playerList.some(p => p.id === sentRequestTo.id)) {
        setSentRequestTo(null);
      }
    };
    const onPlayRequest = (fromPlayer: Player) => setIncomingRequest(fromPlayer);
    const onRequestWithdrawn = (fromPlayerId: string) => {
      if (incomingRequest?.id === fromPlayerId) {
        setIncomingRequest(null);
      }
    };
    const onGameStart = (newGame: Game) => {
      setGame(newGame);
      setView('game');
      setIncomingRequest(null);
      setSentRequestTo(null);
    };
    const onGameUpdate = (updatedGame: Game) => setGame(updatedGame);
    const onOpponentLeft = () => {
      alert('Your opponent has left the game. Returning to lobby.');
      setView('lobby');
      setGame(null);
    };
    const onDisconnect = () => {
      setIsConnecting(false);
      setLoginError("You have been disconnected.");
      setView('login');
      setCurrentPlayer(null);
      setGame(null);
      setPlayers([]);
    };
    const onConnectError = () => {
      setIsConnecting(false);
      setLoginError("Failed to connect to the server. Is it running?");
    }

    socket.on('connect', onConnect)
    socket.on('loginSuccess', onLoginSuccess);
    socket.on('loginError', onLoginError);
    socket.on('updatePlayerList', onUpdatePlayerList);
    socket.on('playRequest', onPlayRequest);
    socket.on('requestWithdrawn', onRequestWithdrawn);
    socket.on('gameStart', onGameStart);
    socket.on('gameUpdate', onGameUpdate);
    socket.on('opponentLeft', onOpponentLeft);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    return () => {
        socket.off('connect', onConnect);
        socket.off('loginSuccess', onLoginSuccess);
        socket.off('loginError', onLoginError);
        socket.off('updatePlayerList', onUpdatePlayerList);
        socket.off('playRequest', onPlayRequest);
        socket.off('requestWithdrawn', onRequestWithdrawn);
        socket.off('gameStart', onGameStart);
        socket.off('gameUpdate', onGameUpdate);
        socket.off('opponentLeft', onOpponentLeft);
        socket.off('disconnect', onDisconnect);
        socket.off('connect_error', onConnectError);
    };
  }, [socket, incomingRequest, sentRequestTo, currentPlayer, loginError]);

  const handleLogin = (pin: string) => {
    setLoginError(null);
    setIsConnecting(true);
    socket?.emit('setPin', pin);
  };

  const renderView = () => {
    switch(view) {
      case 'login':
        return <LoginScreen onLogin={handleLogin} error={loginError} isLoading={isConnecting} />;
      case 'lobby':
        if (!currentPlayer || !socket) return <LoginScreen onLogin={handleLogin} error={"Something went wrong. Please log in again."} isLoading={isConnecting} />;
        return (
          <LobbyScreen 
            socket={socket}
            currentPlayer={currentPlayer} 
            players={players} 
            incomingRequest={incomingRequest}
            setIncomingRequest={setIncomingRequest}
            sentRequestTo={sentRequestTo}
            setSentRequestTo={setSentRequestTo}
          />
        );
      case 'game':
        if (!currentPlayer || !game || !socket) return <LoginScreen onLogin={handleLogin} error={"Something went wrong. Please log in again."} isLoading={isConnecting} />;
        return <GameScreen socket={socket} game={game} setGame={setGame} currentPlayer={currentPlayer} setView={setView} />;
      default:
        return <LoginScreen onLogin={handleLogin} error={loginError} isLoading={isConnecting} />;
    }
  };
  
  return (
    <div className="antialiased text-slate-700">
      {renderView()}
    </div>
  );
};

export default App;
