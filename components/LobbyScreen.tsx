
import React from 'react';
import type { Socket } from 'socket.io-client';
import type { Player, ClientToServerEvents, ServerToClientEvents } from '../types';
import Modal from './Modal';

interface LobbyScreenProps {
  socket: Socket<ServerToClientEvents, ClientToServerEvents>;
  currentPlayer: Player;
  players: Player[];
  incomingRequest: Player | null;
  setIncomingRequest: React.Dispatch<React.SetStateAction<Player | null>>;
  sentRequestTo: Player | null;
  setSentRequestTo: React.Dispatch<React.SetStateAction<Player | null>>;
}

const LobbyScreen: React.FC<LobbyScreenProps> = ({
  socket,
  currentPlayer,
  players,
  incomingRequest,
  setIncomingRequest,
  sentRequestTo,
  setSentRequestTo,
}) => {
  const handlePlayRequest = (toPlayer: Player) => {
    socket.emit('playRequest', toPlayer.id);
    setSentRequestTo(toPlayer);
  };

  const handleWithdrawRequest = (toPlayer: Player) => {
    socket.emit('withdrawRequest', toPlayer.id);
    setSentRequestTo(null);
  };

  const handleAcceptRequest = () => {
    if (incomingRequest) {
      socket.emit('acceptRequest', incomingRequest.id);
      setIncomingRequest(null);
    }
  };

  const handleDeclineRequest = () => {
    if (incomingRequest) {
      socket.emit('declineRequest', incomingRequest.id);
      setIncomingRequest(null);
    }
  };

  const onlinePlayers = players.filter(p => p.id !== currentPlayer.id);

  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow">
          <h1 className="text-2xl font-bold text-gray-800">Lobby</h1>
          <div className="text-right">
            <p className="font-semibold text-indigo-600">{currentPlayer.name}</p>
            <p className="text-sm text-gray-500">Welcome!</p>
          </div>
        </header>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Online Players ({onlinePlayers.length})</h2>
          </div>
          {onlinePlayers.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {onlinePlayers.map((player) => (
                <li key={player.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                  <div>
                    <p className="font-semibold">{player.name}</p>
                    <p className={`text-sm font-medium ${player.status === 'playing' ? 'text-amber-600' : 'text-green-600'}`}>
                      {player.status.charAt(0).toUpperCase() + player.status.slice(1)}
                    </p>
                  </div>
                  {player.status === 'online' && (
                     sentRequestTo?.id === player.id ? (
                      <button 
                        onClick={() => handleWithdrawRequest(player)}
                        className="px-4 py-2 text-sm font-medium text-white bg-gray-500 rounded-md hover:bg-gray-600"
                      >
                        Cancel Request
                      </button>
                    ) : (
                      <button
                        onClick={() => handlePlayRequest(player)}
                        disabled={!!sentRequestTo || !!incomingRequest}
                        className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        Play
                      </button>
                    )
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-gray-500">Waiting for other players to join...</p>
          )}
        </div>
      </div>

      <Modal isOpen={!!incomingRequest}>
        <div className="text-center">
          <h3 className="text-lg font-medium leading-6 text-gray-900">Play Request</h3>
          <div className="mt-2">
            <p className="text-sm text-gray-500">
              <span className="font-bold">{incomingRequest?.name}</span> wants to play with you.
            </p>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
              onClick={handleDeclineRequest}
            >
              Decline
            </button>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700"
              onClick={handleAcceptRequest}
            >
              Accept
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default LobbyScreen;
