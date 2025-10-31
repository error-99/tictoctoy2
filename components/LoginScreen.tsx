
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (pin: string) => void;
  error: string | null;
  isLoading: boolean;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, error, isLoading }) => {
  const [pin, setPin] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.trim() && !isLoading) {
      onLogin(pin.trim());
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-2xl shadow-lg">
        <div>
          <h2 className="text-3xl font-extrabold text-center text-gray-900">
            Real-Time Tic-Tac-Toe
          </h2>
          <p className="mt-2 text-sm text-center text-gray-600">
            Enter your 4-digit PIN to join the lobby
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <input
              id="pin-code"
              name="pin"
              type="password"
              maxLength={4}
              autoComplete="current-password"
              required
              className="relative block w-full px-3 py-4 text-4xl tracking-[1rem] text-center placeholder-gray-400 border-2 border-gray-300 rounded-lg appearance-none focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="••••"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          {error && <p className="text-sm text-center text-red-600 animate-pulse">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="relative flex justify-center w-full px-4 py-3 text-lg font-medium text-white bg-indigo-600 border border-transparent rounded-md group hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400 disabled:cursor-wait"
            >
              {isLoading ? 'Connecting...' : 'Login'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
