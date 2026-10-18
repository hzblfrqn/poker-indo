import React, { useMemo, useState } from 'react';
import type { Card, CardCombination, PlayedTrick } from '@shared/types';
import { CardView } from './CardView';
import {
  canBeat,
  detectCombination,
  isValidLeadPlay,
} from '@shared/evaluator';
import { sounds } from '../utils/audio';
import { Play, SkipForward, ArrowUpDown, X, Check, AlertCircle, Sparkles, Trophy } from 'lucide-react';

interface ActionBarProps {
  hand: Card[];
  selectedCardIds: Set<string>;
  onToggleSelectCard: (cardId: string) => void;
  onClearSelection: () => void;
  onSortByRank: () => void;
  onSortBySuit: () => void;
  onPlay: (cardIds: string[]) => void;
  onPass: () => void;
  isTurn: boolean;
  latestPlay: PlayedTrick | null;
  isFirstTrickOfGame: boolean;
  hasPassedThisTrick: boolean;
  myFinishedRank?: number;
}

function getInvalidComboHint(cards: Card[]): string {
  if (cards.length === 2) {
    return '2 cards must have identical ranks to form a Pair (e.g. 8♦ 8♠).';
  }
  if (cards.length === 3) {
    return '3 cards must be Three of a Kind (e.g. 7-7-7) or 3-Card Straight Flush (same suit consecutive like 6♠-7♠-8♠).';
  }
  if (cards.length === 4) {
    return '4 cards must be a Double Pair (two consecutive pairs like 5-5 & 6-6) or Four of a Kind.';
  }
  if (cards.length === 5) {
    return '5 cards must be Full House (Polo 3+2), Polo Seri (suited run + pair), or 5-Card Straight Flush.';
  }
  return 'Selected cards do not form a valid combination.';
}

export const ActionBar: React.FC<ActionBarProps> = ({
  hand,
  selectedCardIds,
  onToggleSelectCard,
  onClearSelection,
  onSortByRank,
  onSortBySuit,
  onPlay,
  onPass,
  isTurn,
  latestPlay,
  isFirstTrickOfGame,
  hasPassedThisTrick,
  myFinishedRank,
}) => {
  const [clickedDisabledReason, setClickedDisabledReason] = useState<string | null>(null);

  // Extract selected cards (unconditionally at top level)
  const selectedCards = useMemo(() => {
    return hand.filter((c) => selectedCardIds.has(c.id));
  }, [hand, selectedCardIds]);

  // Real-time combination detection (unconditionally at top level)
  const detectedCombo: CardCombination | null = useMemo(() => {
    return detectCombination(selectedCards);
  }, [selectedCards]);

  // Real-time legality check (unconditionally at top level)
  const playValidity = useMemo<{ valid: boolean; reason?: string }>(() => {
    if (!isTurn) {
      return { valid: false, reason: 'Not your turn right now' };
    }
    if (selectedCards.length === 0) {
      return { valid: false, reason: 'Select cards from your hand to play' };
    }
    if (!detectedCombo) {
      return { valid: false, reason: getInvalidComboHint(selectedCards) };
    }

    if (!latestPlay) {
      return isValidLeadPlay(detectedCombo, false);
    } else {
      return canBeat(latestPlay.combination, detectedCombo);
    }
  }, [isTurn, selectedCards, detectedCombo, latestPlay]);

  const canPlay = isTurn && playValidity.valid;
  const canPass = isTurn && latestPlay !== null && !hasPassedThisTrick;

  const handlePlayClick = () => {
    if (canPlay) {
      setClickedDisabledReason(null);
      sounds.playCardPlay();
      onPlay(selectedCards.map((c) => c.id));
    } else {
      setClickedDisabledReason(playValidity.reason || 'Invalid play');
      setTimeout(() => setClickedDisabledReason(null), 4000);
    }
  };

  const handlePassClick = () => {
    if (canPass) {
      sounds.playPassKnock();
      onPass();
    }
  };

  // If local player finished their cards, display finish spectator state safely!
  if (Boolean(myFinishedRank) || hand.length === 0) {
    const rankLabel =
      myFinishedRank === 1
        ? '🥇 1st Place (Winner)'
        : myFinishedRank === 2
        ? '🥈 2nd Place'
        : myFinishedRank === 3
        ? '🥉 3rd Place'
        : '💥 4th Place (Loser)';

    return (
      <div className="w-full flex flex-col items-center justify-center py-5 px-4 text-center select-none animate-in fade-in duration-300">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-2">
          <div className="px-5 py-2 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 font-black text-sm sm:text-base shadow-glow-gold flex items-center gap-2 animate-bounce">
            <Trophy size={18} />
            <span>YOU FINISHED: {rankLabel}</span>
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Spectator Mode</span>
          </div>
        </div>
        <p className="text-slate-300 text-xs sm:text-sm max-w-md">
          You've played all your cards! Watch the remaining players battle for position on the table above.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col items-center select-none pt-2 pb-4">
      {/* Turn status & selection indicator banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full max-w-5xl px-4 mb-2">
        {/* Left: Turn / Pass State */}
        <div className="flex items-center gap-2">
          {hasPassedThisTrick ? (
            <span className="px-3 py-1.5 rounded-full bg-red-950/80 border border-red-700/60 text-red-300 text-xs font-bold shadow-md">
              You passed this trick (waiting for next trick)
            </span>
          ) : isTurn ? (
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-400 text-slate-950 text-xs sm:text-sm font-black animate-pulse shadow-[0_0_25px_rgba(52,211,153,0.8)] border border-white">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-950 animate-ping" />
              ⚡ YOUR TURN TO ACT
            </div>
          ) : (
            <span className="px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-400 text-xs font-medium">
              Waiting for other players...
            </span>
          )}
        </div>

        {/* Center: Live Combination & Rule Feedback */}
        <div className="flex items-center gap-2">
          {selectedCards.length > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-700 text-xs shadow-md">
              <span className="text-slate-400">Selected:</span>
              <span className="font-semibold text-white">
                {detectedCombo ? detectedCombo.displayName : `${selectedCards.length} cards`}
              </span>
              {detectedCombo ? (
                playValidity.valid ? (
                  <span className="flex items-center gap-1 text-emerald-400 font-bold ml-1">
                    <Check size={14} /> Ready
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-400 font-medium ml-1">
                    <AlertCircle size={14} /> {playValidity.reason}
                  </span>
                )
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-medium ml-1">
                  <AlertCircle size={14} /> {playValidity.reason}
                </span>
              )}
            </div>
          ) : isTurn ? (
            <div className="text-xs text-amber-300/90 font-medium flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/40 border border-amber-600/30">
              <Sparkles size={13} className="text-amber-400" />
              {latestPlay
                ? `Beat ${latestPlay.combination.displayName} with a higher ${latestPlay.combination.displayName}`
                : 'Lead any valid combination from your hand'}
            </div>
          ) : null}
        </div>

        {/* Right: Hand Utility Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onSortByRank}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Sort hand by rank"
          >
            <ArrowUpDown size={13} /> Rank
          </button>
          <button
            onClick={onSortBySuit}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 cursor-pointer"
            title="Sort hand by suit"
          >
            <ArrowUpDown size={13} /> Suit
          </button>
          {selectedCardIds.size > 0 && (
            <button
              onClick={onClearSelection}
              className="px-2.5 py-1 text-xs rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
              title="Clear selection"
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Visual Cue for player in turn when no cards selected yet */}
      {isTurn && selectedCardIds.size === 0 && (
        <div className="my-1 px-4 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 text-xs font-bold animate-bounce flex items-center gap-1.5 shadow-md">
          <span>👇 Select cards from your hand below to play</span>
        </div>
      )}

      {/* Local Player's Hand of Cards - Spaced out side-by-side so cards are NEVER in front of each other */}
      <div className="w-full max-w-7xl overflow-x-auto py-4 px-4 flex justify-start sm:justify-center">
        <div className="flex items-center gap-2 sm:gap-2.5 md:gap-3 px-2 transition-all">
          {hand.map((card) => {
            const isSelected = selectedCardIds.has(card.id);

            return (
              <div
                key={card.id}
                className="relative flex-shrink-0"
                onClick={() => {
                  sounds.playCardSelect();
                  onToggleSelectCard(card.id);
                }}
              >
                <CardView
                  card={card}
                  selected={isSelected}
                  size="lg"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Reason notice if clicked disabled Play */}
      {clickedDisabledReason && (
        <div className="mb-2 px-4 py-1.5 rounded-xl bg-amber-950 border border-amber-500 text-amber-200 text-xs font-semibold flex items-center gap-1.5 animate-bounce shadow-md">
          <AlertCircle size={15} className="text-amber-400" />
          <span>{clickedDisabledReason}</span>
        </div>
      )}

      {/* Action Play & Pass Buttons */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <button
          onClick={handlePlayClick}
          className={`
            px-8 py-3 rounded-xl font-bold text-sm sm:text-base flex items-center gap-2 transition-all duration-200 shadow-lg cursor-pointer
            ${canPlay
              ? 'bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white shadow-emerald-950/60 ring-2 ring-emerald-400/50 hover:scale-105 active:scale-95'
              : 'bg-slate-800 hover:bg-slate-700/80 text-slate-400 border border-slate-700/80 opacity-70'}
          `}
          title={!canPlay ? playValidity.reason : 'Play selected cards'}
        >
          <Play size={18} fill="currentColor" />
          PLAY CARDS
        </button>

        <button
          onClick={handlePassClick}
          disabled={!canPass}
          className={`
            px-6 py-3 rounded-xl font-semibold text-sm sm:text-base flex items-center gap-2 transition-all duration-200 shadow-md
            ${canPass
              ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-600 hover:scale-105 active:scale-95 cursor-pointer'
              : 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed opacity-50'}
          `}
          title={!canPass ? (latestPlay === null ? 'Cannot pass when leading' : 'Not your turn') : 'Pass your turn'}
        >
          <SkipForward size={18} />
          PASS
        </button>
      </div>
    </div>
  );
};
