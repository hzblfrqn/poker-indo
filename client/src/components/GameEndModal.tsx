import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import type { PlayerPublic, BombEventNotification } from '@shared/types';
import { Trophy, RotateCcw, Home, Award } from 'lucide-react';
import { sounds } from '../utils/audio';

interface GameEndModalProps {
  winnerPlayerId: string | null;
  players: PlayerPublic[];
  myPlayerId: string;
  isHost: boolean;
  bombAlert?: BombEventNotification | null;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
}

export const GameEndModal: React.FC<GameEndModalProps> = ({
  winnerPlayerId,
  players,
  myPlayerId,
  bombAlert,
  onPlayAgain,
  onLeaveRoom,
}) => {
  const winner = players.find((p) => p.id === winnerPlayerId);
  const isMeWinner = winnerPlayerId === myPlayerId;

  useEffect(() => {
    try {
      sounds.playVictoryFanfare();
    } catch (e) {
      console.warn('Audio effect failed', e);
    }

    try {
      const confettiFn = typeof confetti === 'function' ? confetti : (confetti as any)?.default;
      if (typeof confettiFn === 'function') {
        const end = Date.now() + 2500;
        const colors = ['#eab308', '#10b981', '#3b82f6', '#ec4899', '#ffffff'];

        const frame = () => {
          try {
            confettiFn({
              particleCount: 4,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
              colors,
            });
            confettiFn({
              particleCount: 4,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
              colors,
            });

            if (Date.now() < end) {
              requestAnimationFrame(frame);
            }
          } catch {
            // Ignore frame errors
          }
        };
        frame();
      }
    } catch (e) {
      console.warn('Confetti effect failed', e);
    }
  }, []);

  // Sorted standings by finishedRank or cardCount
  const sortedPlayers = [...players].sort((a, b) => {
    if (a.finishedRank && b.finishedRank) return a.finishedRank - b.finishedRank;
    if (a.finishedRank) return -1;
    if (b.finishedRank) return 1;
    if (a.id === winnerPlayerId) return -1;
    if (b.id === winnerPlayerId) return 1;
    return a.cardCount - b.cardCount;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-3xl glass-panel-gold border-2 border-gold/60 p-6 sm:p-8 flex flex-col items-center text-center shadow-2xl">
        {/* Trophy icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-yellow-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-glow-gold mb-4 animate-bounce">
          <Trophy size={42} strokeWidth={2.5} />
        </div>

        {/* Title */}
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-gold tracking-wide">
          {isMeWinner ? '🎉 VICTORY! YOU WON! 🎉' : `🏆 ${winner?.displayName || 'Player'} WINS!`}
        </h2>
        <p className="text-slate-300 text-sm mt-1">
          {winner?.displayName} finished first! All positions decided.
        </p>

        {/* Bomb Knockout Highlight Banner */}
        {bombAlert && (
          <div className="mt-3 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-950/90 via-orange-950/80 to-amber-950/90 border border-red-500/80 text-amber-200 text-xs font-bold shadow-md flex items-center gap-1.5 animate-pulse">
            <span>💣 {bombAlert.message}</span>
          </div>
        )}

        {/* Standings Table */}
        <div className="w-full mt-6 rounded-2xl bg-slate-950/70 border border-slate-800 overflow-hidden divide-y divide-slate-800">
          <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-mono uppercase tracking-wider text-slate-400 bg-slate-900/80">
            <span className="col-span-3 text-left">Rank</span>
            <span className="col-span-6 text-left">Player</span>
            <span className="col-span-3 text-right">Cards Left</span>
          </div>

          {sortedPlayers.map((p, idx) => {
            const rankNum = p.finishedRank ?? (idx + 1);
            const isW = rankNum === 1;
            const isLoser = rankNum === 4;
            const rankLabel = rankNum === 1 ? '🥇 1st' : rankNum === 2 ? '🥈 2nd' : rankNum === 3 ? '🥉 3rd' : '💥 4th (Loser)';

            return (
              <div
                key={p.id}
                className={`grid grid-cols-12 px-4 py-3 text-sm items-center ${
                  isW
                    ? 'bg-amber-500/10 font-bold text-amber-300'
                    : isLoser
                    ? 'bg-rose-950/20 text-rose-300 font-semibold'
                    : 'text-slate-200'
                } ${p.id === myPlayerId ? 'ring-1 ring-inset ring-emerald-500/50' : ''}`}
              >
                <span className="col-span-3 flex items-center gap-1 font-bold text-xs sm:text-sm">
                  {rankLabel}
                </span>
                <span className="col-span-6 truncate text-left font-medium">
                  {p.displayName} {p.id === myPlayerId ? '(You)' : ''}
                </span>
                <span className="col-span-3 text-right font-mono font-bold">
                  {p.cardCount}
                </span>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full mt-6">
          <button
            onClick={onPlayAgain}
            className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-gold via-yellow-400 to-gold text-slate-950 font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg hover:scale-105 active:scale-95 transition-transform cursor-pointer"
          >
            <RotateCcw size={18} />
            Return to Room Lobby (Rematch)
          </button>

          <button
            onClick={onLeaveRoom}
            className="w-full py-3.5 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-sm sm:text-base flex items-center justify-center gap-2 border border-slate-700 transition-colors cursor-pointer"
          >
            <Home size={18} />
            Leave to Menu
          </button>
        </div>
      </div>
    </div>
  );
};
