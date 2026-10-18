import React from 'react';
import type { BombEventNotification, OpeningThreeCard, PlayedTrick } from '@shared/types';
import { CardView } from './CardView';
import { Flame, Sparkles, Crown } from 'lucide-react';

interface TableCenterProps {
  latestPlay: PlayedTrick | null;
  isFirstTrickOfGame: boolean;
  leadPlayerName?: string;
  bombAlert: BombEventNotification | null;
  openingThreesShowcase?: OpeningThreeCard[] | null;
}

export const TableCenter: React.FC<TableCenterProps> = ({
  latestPlay,
  isFirstTrickOfGame,
  leadPlayerName,
  bombAlert,
  openingThreesShowcase,
}) => {
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[170px] sm:min-h-[210px] w-full max-w-lg mx-auto py-3 px-4">
      {/* Bomb Alert Banner */}
      {bombAlert && (
        <div className="absolute -top-10 z-40 bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 text-white font-extrabold px-4 py-1.5 rounded-full shadow-2xl border-2 border-yellow-200 animate-bounce text-xs sm:text-sm flex items-center gap-1.5">
          <Flame size={18} className="animate-pulse" />
          <span>{bombAlert.message}</span>
        </div>
      )}

      {latestPlay ? (
        <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
          {/* Combination name & Player badge */}
          <div className="mb-2.5 flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-slate-950/80 border border-gold/40 text-gold font-semibold text-xs sm:text-sm shadow-md flex items-center gap-1.5">
              <Sparkles size={14} className="text-gold" />
              {latestPlay.combination.displayName}
            </span>
            <span className="text-xs text-slate-300 font-medium">
              by <strong className="text-white">{latestPlay.playerName}</strong>
            </span>
          </div>

          {/* Cards fan display with entrance animation */}
          <div className="flex items-center justify-center -space-x-4 sm:-space-x-5 py-1">
            {latestPlay.combination.cards.map((card, idx) => {
              const rotation = (idx - (latestPlay.combination.cards.length - 1) / 2) * 5;
              return (
                <div
                  key={`${latestPlay.timestamp}-${card.id}`}
                  className="animate-card-play transform transition-transform hover:scale-110 hover:-translate-y-2 z-10 hover:z-30 duration-150"
                  style={{
                    animationDelay: `${idx * 0.08}s`,
                    transform: `rotate(${rotation}deg)`,
                  }}
                >
                  <CardView card={card} size="md" disabled />
                </div>
              );
            })}
          </div>
        </div>
      ) : openingThreesShowcase && openingThreesShowcase.length > 0 ? (
        /* Opening Phase Showcase: All 3s placed on table side-by-side */
        <div className="flex flex-col items-center animate-in fade-in duration-300">
          <div className="mb-2 px-3.5 py-1 rounded-full bg-gold/20 border border-gold/50 text-gold font-bold text-xs sm:text-sm shadow-md flex items-center gap-1.5">
            <Sparkles size={14} />
            <span>Opening Phase: All 3s on the Table</span>
          </div>

          {/* 3s spread side-by-side with player names */}
          <div className="flex items-center justify-center gap-2 sm:gap-3 py-1">
            {openingThreesShowcase.map((item) => (
              <div key={item.card.id} className="flex flex-col items-center">
                <div className={`relative ${item.isWinner ? 'scale-105 ring-2 ring-gold rounded-lg shadow-glow-gold' : ''}`}>
                  {item.isWinner && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-30 bg-gold text-slate-950 px-1.5 py-0.2 rounded-full font-black text-[9px] flex items-center gap-0.5 shadow-md uppercase whitespace-nowrap animate-bounce">
                      <Crown size={10} /> Highest
                    </div>
                  )}
                  <CardView card={item.card} size="sm" disabled />
                </div>
                <span className="text-[10px] text-slate-300 font-medium mt-1 max-w-[70px] truncate text-center" title={item.playerName}>
                  {item.playerName}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-slate-300 mt-2 text-center max-w-xs">
            <strong className="text-amber-300">{leadPlayerName}</strong> holds <strong>3♠</strong> and leads the first trick!
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-200/80 max-w-sm">
          <div className="font-display tracking-wider text-sm font-bold text-amber-300/90 mb-1">
            TRICK CLEARED
          </div>
          <p className="text-xs text-slate-300">
            {leadPlayerName ? (
              <>
                <strong className="text-emerald-300">{leadPlayerName}</strong> won the trick and leads next.
              </>
            ) : (
              'Lead any valid card combination from your hand.'
            )}
          </p>
        </div>
      )}
    </div>
  );
};
