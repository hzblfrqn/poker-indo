import React from 'react';
import type { PlayerPublic } from '@shared/types';
import { Crown, WifiOff, Bot } from 'lucide-react';

interface OpponentSeatProps {
  player?: PlayerPublic;
  position: 'top' | 'left' | 'right';
  isTurn: boolean;
  seatNumber: number;
}

export const OpponentSeat: React.FC<OpponentSeatProps> = ({
  player,
  isTurn,
  seatNumber,
}) => {
  if (!player) {
    return (
      <div className="flex flex-col items-center justify-center p-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 text-slate-500 w-36 sm:w-44 text-center">
        <span className="text-xs uppercase font-mono tracking-wider">Empty Seat {seatNumber + 1}</span>
        <span className="text-[11px] mt-0.5">Waiting for player...</span>
      </div>
    );
  }

  const avatarInitials = player.displayName.slice(0, 2).toUpperCase();
  const isBot = player.isBot ?? false;

  return (
    <div
      className={`
        relative flex flex-col items-center p-2.5 sm:p-3 rounded-2xl transition-all duration-300
        ${isTurn ? 'glass-panel-gold ring-2 ring-gold scale-105 z-20' : 'glass-panel border-slate-700/60'}
        ${player.passedInCurrentTrick ? 'opacity-60 saturate-50' : 'opacity-100'}
        w-36 sm:w-44
      `}
    >
      {/* Finished Rank indicator badge */}
      {player.finishedRank ? (
        <div className={`absolute -top-3 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase shadow-md flex items-center gap-1 ${
          player.finishedRank === 1
            ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-glow-gold animate-bounce'
            : player.finishedRank === 2
            ? 'bg-slate-300 text-slate-950 border border-slate-100'
            : player.finishedRank === 3
            ? 'bg-amber-700 text-amber-100 border border-amber-600'
            : 'bg-rose-950 text-rose-300 border border-rose-700'
        }`}>
          {player.finishedRank === 1 ? '🥇 1st Place' : player.finishedRank === 2 ? '🥈 2nd Place' : player.finishedRank === 3 ? '🥉 3rd Place' : '💥 4th (Loser)'}
        </div>
      ) : isTurn ? (
        /* Turn indicator badge */
        <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-gold text-slate-950 text-[10px] font-bold tracking-wider uppercase animate-pulse shadow-glow-gold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          Thinking...
        </div>
      ) : player.passedInCurrentTrick ? (
        /* Passed indicator badge */
        <div className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-red-900/90 text-red-200 border border-red-500/50 text-[10px] font-bold tracking-wider uppercase shadow-sm">
          Passed
        </div>
      ) : null}

      {/* Avatar and Host / Bot Icon */}
      <div className="relative mb-1.5">
        <div
          className={`
            w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-md
            ${player.finishedRank === 1
              ? 'bg-gradient-to-tr from-amber-400 to-yellow-200 text-slate-950 ring-2 ring-gold'
              : isTurn
              ? 'bg-gradient-to-tr from-gold to-yellow-200 text-slate-950'
              : isBot
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-500 text-white'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white'}
          `}
        >
          {player.finishedRank === 1 ? <Crown size={22} className="text-slate-950" /> : isBot ? <Bot size={20} /> : avatarInitials}
        </div>
        {player.isHost && (
          <div className="absolute -bottom-1 -right-1 bg-amber-500 text-slate-950 p-0.5 rounded-full shadow" title="Room Host">
            <Crown size={12} strokeWidth={2.5} />
          </div>
        )}
        {!player.isConnected && (
          <div className="absolute -top-1 -right-1 bg-rose-600 text-white p-0.5 rounded-full shadow" title="Disconnected">
            <WifiOff size={12} strokeWidth={2.5} />
          </div>
        )}
      </div>

      {/* Display Name with optional Bot Tag */}
      <div className="flex items-center gap-1 max-w-[130px]">
        <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate text-center" title={player.displayName}>
          {player.displayName}
        </span>
      </div>

      {/* Visualization of Remaining Cards: Layered Mini Deck Stack + Meter */}
      {player.finishedRank ? (
        <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-950/80 border border-slate-700 text-[10px] font-bold text-amber-300">
          FINISHED
        </div>
      ) : (
        <div className="mt-1.5 flex flex-col items-center w-full px-2">
          {/* Mini Layered Card Fan Stack physically visualizing each remaining card */}
          <div className="flex items-center justify-center h-5 py-0.5 pl-2 overflow-hidden select-none mb-1">
            {Array.from({ length: Math.min(player.cardCount, 13) }).map((_, i) => (
              <div
                key={i}
                className="w-2.5 h-4 -ml-1.5 rounded-[2px] bg-gradient-to-b from-blue-500 via-indigo-600 to-blue-800 border-[0.5px] border-blue-200/70 shadow-xs transform transition-transform hover:-translate-y-0.5"
                style={{
                  transform: `rotate(${(i - Math.min(player.cardCount, 13) / 2) * 2}deg)`,
                }}
              />
            ))}
          </div>

          {/* Cards Count Badge with danger alert when 1-2 cards left */}
          <div className="flex items-center justify-between w-full px-1 text-[10px]">
            <span className={`font-mono font-bold ${
              player.cardCount <= 2
                ? 'text-red-400 animate-pulse font-black'
                : player.cardCount <= 6
                ? 'text-amber-300'
                : 'text-slate-300'
            }`}>
              {player.cardCount <= 2 ? `🔥 ${player.cardCount} LEFT!` : `${player.cardCount} cards`}
            </span>
            <span className="text-[9px] text-slate-500 font-mono">
              {Math.round((player.cardCount / 13) * 100)}%
            </span>
          </div>

          {/* Visual Progress Bar Meter */}
          <div className="w-full h-1 bg-slate-800/90 rounded-full overflow-hidden mt-0.5 border border-slate-700/50">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                player.cardCount <= 2
                  ? 'bg-red-500 animate-pulse'
                  : player.cardCount <= 6
                  ? 'bg-amber-400'
                  : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, (player.cardCount / 13) * 100))}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
