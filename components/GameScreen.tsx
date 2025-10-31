
import React, { useState, useEffect, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import type { Game, Player, ClientToServerEvents, ServerToClientEvents } from '../types';
import { IconX, IconO } from './icons';
import Modal from './Modal';

interface GameScreenProps {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  game: Game;
  setGame: React.Dispatch<React.SetStateAction<Game | null>>;
  currentPlayer: Player;
  setView: (view: 'login' | 'lobby' | 'game') => void;
}

const GameScreen: React.FC<GameScreenProps> = ({ socket, game, setGame, currentPlayer, setView }) => {
  const [chatMessages, setChatMessages] = useState<{ from: string; text: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleChatMessage = (message: { from: string; text: string }) => {
      setChatMessages((prev) => [...prev, message]);
    };

    socket.on('chatMessage', handleChatMessage);
    return () => {
      socket.off('chatMessage', handleChatMessage);
    };
  }, [socket]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleCellClick = (index: number) => {
    if (game.board[index] || game.winner || game.turn !== game.playerSymbol) return;
    socket.emit('move', index);
  };

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      socket.emit('chatMessage', chatInput.trim());
      setChatMessages(prev => [...prev, { from: currentPlayer.name, text: chatInput.trim() }]);
      setChatInput('');
    }
  };

  const handleNewGame = () => socket.emit('newGameRequest');
  
  const handleLeaveGame = () => {
    socket.emit('leaveRoom');
    setGame(null);
    setView('lobby');
  };

  const getStatusMessage = () => {
    if (game.winner) {
      if (game.winner === 'draw') return "It's a draw!";
      const winnerName = game.winner === game.playerSymbol ? 'You' : game.opponentName;
      return `${winnerName} won!`;
    }
    return game.turn === game.playerSymbol ? 'Your turn' : `Waiting for ${game.opponentName}...`;
  };

  const renderCellContent = (value: string | null) => {
    if (value === 'X') return <IconX className="w-3/4 h-3/4 text-red-500" />;
    if (value === 'O') return <IconO className="w-3/4 h-3/4 text-blue-500" />;
    return null;
  };
  
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-2 sm:p-4">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
        
        <div className="lg:col-span-2 bg-white rounded-lg shadow-lg p-4 sm:p-6 flex flex-col items-center">
            <div className="flex justify-between w-full items-center mb-4">
                <div className="text-center p-2 rounded-lg bg-indigo-50 border-2 border-indigo-200">
                    <p className="font-bold text-lg text-indigo-800">{currentPlayer.name} ({game.playerSymbol})</p>
                    <p className="text-sm text-gray-500">You</p>
                </div>
                <p className="text-xl font-bold text-gray-700">vs</p>
                 <div className="text-center p-2 rounded-lg bg-gray-50 border-2 border-gray-200">
                    <p className="font-bold text-lg text-gray-800">{game.opponentName} ({game.playerSymbol === 'X' ? 'O' : 'X'})</p>
                    <p className="text-sm text-gray-500">Opponent</p>
                </div>
            </div>

            <p className={`text-xl font-semibold mb-4 p-2 rounded-md ${game.turn === game.playerSymbol && !game.winner ? 'bg-green-100 text-green-800 animate-pulse' : 'bg-gray-100 text-gray-800'}`}>
                {getStatusMessage()}
            </p>

            <div className="grid grid-cols-3 gap-3 w-full max-w-md aspect-square">
                {game.board.map((cell, index) => (
                    <button
                        key={index}
                        onClick={() => handleCellClick(index)}
                        disabled={!!cell || !!game.winner || game.turn !== game.playerSymbol}
                        className="bg-slate-200 rounded-lg flex items-center justify-center transition-colors duration-200 hover:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        {renderCellContent(cell)}
                    </button>
                ))}
            </div>
             <div className="mt-6 flex space-x-4">
                 <button onClick={handleLeaveGame} className="px-6 py-2 text-white bg-red-600 rounded-md hover:bg-red-700">
                    Leave Game
                </button>
             </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 flex flex-col h-[80vh] lg:h-auto max-h-[500px] lg:max-h-full">
          <h3 className="text-lg font-bold border-b pb-2 mb-2">Chat</h3>
          <div className="flex-grow overflow-y-auto mb-4 space-y-3 pr-2 flex flex-col">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`p-2 rounded-lg max-w-[85%] ${msg.from === currentPlayer.name ? 'bg-indigo-100 self-end' : 'bg-gray-200 self-start'}`}>
                <p className={`font-bold text-sm ${msg.from === currentPlayer.name ? 'text-indigo-700' : 'text-gray-700'}`}>{msg.from === currentPlayer.name ? 'You' : msg.from}</p>
                <p className="text-sm break-words">{msg.text}</p>
              </div>
            ))}
             <div ref={chatEndRef} />
          </div>
          <form onSubmit={handleChatSubmit} className="flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-grow px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              disabled={!!game.winner}
            />
            <button type="submit" className="px-4 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400" disabled={!!game.winner}>Send</button>
          </form>
        </div>
      </div>
       <Modal isOpen={!!game.winner}>
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">{getStatusMessage()}</h3>
          <div className="flex justify-center space-x-4">
            <button onClick={handleLeaveGame} className="px-6 py-2 text-white bg-gray-500 rounded-md hover:bg-gray-600">
              Back to Lobby
            </button>
            <button onClick={handleNewGame} className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700">
              New Game
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default GameScreen;
