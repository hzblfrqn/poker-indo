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
      {/* Turn indicator badge */}
      {isTurn && (
        <div className="absolute -top-3 px-2 py-0.5 rounded-full bg-gold text-slate-950 text-[10px] font-bold tracking-wider uppercase animate-pulse shadow-glow-gold flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" />
          Thinking...
        </div>
      )}

      {/* Passed indicator badge */}
      {player.passedInCurrentTrick && !isTurn && (
        <div className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-red-900/90 text-red-200 border border-red-500/50 text-[10px] font-bold tracking-wider uppercase shadow-sm">
          Passed
        </div>
      )}

      {/* Avatar and Host / Bot Icon */}
      <div className="relative mb-1.5">
        <div
          className={`
            w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-md
            ${isTurn
              ? 'bg-gradient-to-tr from-gold to-yellow-200 text-slate-950'
              : isBot
              ? 'bg-gradient-to-tr from-indigo-600 to-purple-500 text-white'
              : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white'}
          `}
        >
          {isBot ? <Bot size={20} /> : avatarInitials}
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

      {/* Remaining Cards Badge */}
      <div className="mt-1 flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-950/70 border border-slate-700/80 shadow-inner">
        <div className="w-2.5 h-3.5 bg-gradient-to-b from-blue-400 to-blue-700 rounded-sm border border-blue-200 shadow-xs" />
        <span className="font-mono text-xs font-bold text-amber-300">
          {player.cardCount}
        </span>
        <span className="text-[10px] text-slate-400 uppercase tracking-tighter">cards</span>
      </div>
    </div>
  );
};
