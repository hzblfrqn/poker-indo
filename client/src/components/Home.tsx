import React, { useState } from 'react';
import { PlusCircle, LogIn, BookOpen, ShieldCheck, Sparkles, Flame, Users } from 'lucide-react';

interface HomeProps {
  displayName: string;
  onChangeDisplayName: (name: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onOpenRules: () => void;
  errorMessage?: string | null;
}

export const Home: React.FC<HomeProps> = ({
  displayName,
  onChangeDisplayName,
  onCreateRoom,
  onJoinRoom,
  onOpenRules,
  errorMessage,
}) => {
  const [joinCode, setJoinCode] = useState('');

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (joinCode.trim()) {
      onJoinRoom(joinCode.trim().toUpperCase());
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-4 py-8 sm:py-12 animate-in fade-in duration-300">
      {/* Hero Header */}
      <div className="text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-900 border border-slate-700/80 text-gold text-xs font-semibold mb-3 shadow-md">
          <Sparkles size={14} className="text-gold" />
          <span>Multiplayer 4-Player Card Game</span>
        </div>
        <h1 className="font-display text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-amber-400 to-yellow-500 tracking-tight drop-shadow-md">
          Indonesian Poker
        </h1>
        <p className="font-display text-base sm:text-xl text-slate-300 tracking-wider mt-1 font-semibold">
          Capsa Banting
        </p>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-2">
          Play with 4 friends in real time. Master Double Pairs, Polo, Polo Seri, and bomb Single 2s!
        </p>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="w-full max-w-md mb-6 p-3 rounded-xl bg-red-950/80 border border-red-500 text-red-200 text-xs sm:text-sm text-center shadow-lg">
          {errorMessage}
        </div>
      )}

      {/* Player Display Name Input Card */}
      <div className="w-full max-w-md glass-panel-gold p-6 rounded-3xl mb-8 shadow-xl">
        <label className="block text-xs font-mono uppercase tracking-wider text-amber-300 font-semibold mb-2">
          Your Player Name
        </label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => onChangeDisplayName(e.target.value)}
          placeholder="Enter display name..."
          maxLength={20}
          className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-white font-semibold placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-gold text-sm sm:text-base shadow-inner"
        />
        <span className="text-[11px] text-slate-400 mt-1 block">
          This name will appear on the table during multiplayer matches.
        </span>
      </div>

      {/* Action Cards Grid: Create Room & Join Room */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-5 mb-10">
        {/* Create Room Card */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border border-emerald-500/30 hover:border-emerald-500/60 transition-all duration-200 hover:-translate-y-1 shadow-lg group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <PlusCircle size={26} />
            </div>
            <h2 className="font-display text-lg font-bold text-white mb-1">
              Create Room
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Start a private 4-player game and invite friends with a room code.
            </p>
          </div>
          <button
            onClick={onCreateRoom}
            disabled={!displayName.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle size={17} />
            Host New Game
          </button>
        </div>

        {/* Join Room Card */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between border border-blue-500/30 hover:border-blue-500/60 transition-all duration-200 hover:-translate-y-1 shadow-lg group">
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-950 border border-blue-500/40 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <LogIn size={26} />
            </div>
            <h2 className="font-display text-lg font-bold text-white mb-1">
              Join Room
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              Have a 6-character room code from a friend? Enter it below.
            </p>
          </div>
          <form onSubmit={handleJoinSubmit} className="space-y-3">
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7KX92M"
              maxLength={6}
              className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-center font-mono text-base font-bold tracking-widest text-gold placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <button
              type="submit"
              disabled={!joinCode.trim() || !displayName.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md transition-all hover:scale-102 active:scale-98 disabled:opacity-50 cursor-pointer"
            >
              <LogIn size={17} />
              Join Table
            </button>
          </form>
        </div>
      </div>

      {/* Quick Rules Highlights */}
      <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-slate-800 text-left">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={18} className="text-gold" />
            <h3 className="font-display text-base font-bold text-white">How To Play Highlights</h3>
          </div>
          <button
            onClick={onOpenRules}
            className="text-xs text-gold hover:underline font-semibold"
          >
            Full Rules Guide →
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="font-bold text-amber-300 mb-1 flex items-center gap-1">
              <Sparkles size={13} /> 3s on the Table
            </div>
            All players place their 3s on the table. Highest 3 (3♠) wins the opening & leads!
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="font-bold text-emerald-400 mb-1 flex items-center gap-1">
              <Users size={13} /> Unique Combos
            </div>
            Double Pairs (consecutive!), Polo (Full House), and Polo Seri (Straight Flush + Pair).
          </div>
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="font-bold text-red-400 mb-1 flex items-center gap-1">
              <Flame size={13} /> Bomb Counter
            </div>
            Single 2s can be countered by a Bomb (4-of-a-Kind or 5-Card Straight Flush)!
          </div>
        </div>
      </div>

      {/* Casual Game Disclaimer */}
      <div className="mt-8 flex items-center gap-2 text-slate-500 text-xs">
        <ShieldCheck size={16} className="text-emerald-500" />
        <span>Casual multiplayer card game • No gambling, bets, or real-money transactions</span>
      </div>
    </div>
  );
};
