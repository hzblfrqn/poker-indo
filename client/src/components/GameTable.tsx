import React, { useState, useEffect } from 'react';
import type { Card, GameStatePublic, PlayerSeat } from '@shared/types';
import { OpponentSeat } from './OpponentSeat';
import { TableCenter } from './TableCenter';
import { ActionBar } from './ActionBar';
import { GameLog } from './GameLog';
import { GameEndModal } from './GameEndModal';
import { sortHand } from '@shared/deck';
import { sounds } from '../utils/audio';
import { Volume2, VolumeX, BookOpen, LogOut } from 'lucide-react';

interface GameTableProps {
  publicState: GameStatePublic;
  myHand: Card[];
  myPlayerId: string;
  onPlayCards: (cardIds: string[]) => void;
  onPass: () => void;
  onSendMessage: (msg: string) => void;
  onPlayAgain: () => void;
  onLeaveRoom: () => void;
  onOpenRules: () => void;
}

export const GameTable: React.FC<GameTableProps> = ({
  publicState,
  myHand,
  myPlayerId,
  onPlayCards,
  onPass,
  onSendMessage,
  onPlayAgain,
  onLeaveRoom,
  onOpenRules,
}) => {
  const [selectedCardIds, setSelectedCardIds] = useState<Set<string>>(new Set());
  const [localHand, setLocalHand] = useState<Card[]>(myHand);
  const [muted, setMuted] = useState(!sounds.enabled);
  const [shakeTable, setShakeTable] = useState(false);

  // Sync hand whenever server updates it
  useEffect(() => {
    setLocalHand(sortHand(myHand));
    // Prune any selected card that is no longer in hand
    setSelectedCardIds((prev) => {
      const next = new Set<string>();
      for (const id of prev) {
        if (myHand.some((c) => c.id === id)) {
          next.add(id);
        }
      }
      return next;
    });
  }, [myHand]);

  // Find local player
  const me = publicState.players.find((p) => p.id === myPlayerId);
  const mySeat: PlayerSeat = me?.seat ?? 0;
  const isMyTurn = publicState.currentTurnSeat === mySeat;

  // Sound chime and update browser tab title when it becomes local player's turn
  useEffect(() => {
    if (isMyTurn) {
      sounds.playTurnNotification();
      document.title = '🟢 [YOUR TURN!] Indonesian Poker';
    } else {
      document.title = 'Indonesian Poker (Capsa Banting)';
    }
    return () => {
      document.title = 'Indonesian Poker (Capsa Banting)';
    };
  }, [isMyTurn]);

  // Screen shake and bomb audio on bomb explosion
  useEffect(() => {
    if (publicState.bombAlert) {
      sounds.playBombExplosion();
      setShakeTable(true);
      const timer = setTimeout(() => setShakeTable(false), 800);
      return () => clearTimeout(timer);
    }
  }, [publicState.bombAlert]);

  // Opponent Seats relative to local player:
  const rightSeatNumber = ((mySeat + 1) % 4) as PlayerSeat;
  const topSeatNumber = ((mySeat + 2) % 4) as PlayerSeat;
  const leftSeatNumber = ((mySeat + 3) % 4) as PlayerSeat;

  const rightPlayer = publicState.players.find((p) => p.seat === rightSeatNumber);
  const topPlayer = publicState.players.find((p) => p.seat === topSeatNumber);
  const leftPlayer = publicState.players.find((p) => p.seat === leftSeatNumber);

  const toggleSelectCard = (cardId: string) => {
    setSelectedCardIds((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedCardIds(new Set());
  };

  const handleSortByRank = () => {
    setLocalHand((prev) => sortHand(prev, undefined, false));
  };

  const handleSortBySuit = () => {
    setLocalHand((prev) => sortHand(prev, undefined, true));
  };

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setMuted(!sounds.enabled);
  };

  const trickLeadPlayer = publicState.players.find(
    (p) => p.id === publicState.trickLeadPlayerId
  );

  return (
    <div className={`relative min-h-screen w-full flex flex-col justify-between overflow-x-hidden ${shakeTable ? 'animate-shake' : ''}`}>
      {/* Top Game Navigation Bar */}
      <header className="w-full flex items-center justify-between px-4 sm:px-6 py-2.5 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 z-30">
        <div className="flex items-center gap-3">
          <span className="font-display font-extrabold text-sm sm:text-base text-gold">
            Indonesian Poker
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 font-mono text-xs text-slate-300">
            Room: <strong className="text-white">{publicState.roomId}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 transition-colors cursor-pointer"
            title={muted ? 'Unmute audio' : 'Mute audio'}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            onClick={onOpenRules}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={14} className="text-amber-400" />
            Rules
          </button>
          <button
            onClick={onLeaveRoom}
            className="p-2 rounded-xl bg-slate-900 hover:bg-red-950 text-slate-400 hover:text-red-300 transition-colors cursor-pointer"
            title="Leave room"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Table Felt Arena */}
      <main className="flex-1 flex flex-col items-center justify-center p-2 sm:p-4 w-full max-w-7xl mx-auto relative my-auto">
        <div className="w-full rounded-[40px] sm:rounded-[60px] poker-felt p-4 sm:p-8 flex flex-col justify-between items-center min-h-[460px] sm:min-h-[520px] max-w-5xl relative">
          {/* Top Opponent */}
          <div className="w-full flex justify-center -mt-2 sm:-mt-4">
            <OpponentSeat
              player={topPlayer}
              position="top"
              isTurn={publicState.currentTurnSeat === topSeatNumber}
              seatNumber={topSeatNumber}
            />
          </div>

          {/* Middle Row: Left Opponent - Center Felt - Right Opponent */}
          <div className="w-full flex items-center justify-between gap-2 sm:gap-4 my-2 sm:my-4">
            {/* Left Opponent */}
            <div className="flex justify-start">
              <OpponentSeat
                player={leftPlayer}
                position="left"
                isTurn={publicState.currentTurnSeat === leftSeatNumber}
                seatNumber={leftSeatNumber}
              />
            </div>

            {/* Center Felt Play Area */}
            <div className="flex-1 flex justify-center">
              <TableCenter
                latestPlay={publicState.latestPlay}
                isFirstTrickOfGame={publicState.isFirstTrickOfGame}
                leadPlayerName={trickLeadPlayer?.displayName}
                bombAlert={publicState.bombAlert}
                openingThreesShowcase={publicState.openingThreesShowcase}
              />
            </div>

            {/* Right Opponent */}
            <div className="flex justify-end">
              <OpponentSeat
                player={rightPlayer}
                position="right"
                isTurn={publicState.currentTurnSeat === rightSeatNumber}
                seatNumber={rightSeatNumber}
              />
            </div>
          </div>

          {/* Bottom Felt Turn Status Indicator - Eyesight cannot miss this! */}
          <div className="w-full max-w-lg mx-auto my-2 z-20">
            {me?.finishedRank ? (
              <div className="py-2 px-5 rounded-2xl bg-slate-900/90 border border-gold/60 text-gold text-xs sm:text-sm font-bold text-center flex items-center justify-center gap-2 mx-auto w-fit shadow-glow-gold">
                <span>
                  🎉 You finished in {me.finishedRank === 1 ? '1st Place' : me.finishedRank === 2 ? '2nd Place' : '3rd Place'}! Battle continuing for remaining positions...
                </span>
              </div>
            ) : isMyTurn ? (
              <div className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white font-black text-sm sm:text-base text-center shadow-[0_0_25px_rgba(16,185,129,0.5)] border-2 border-emerald-300 animate-pulse flex items-center justify-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <span>👉 IT'S YOUR TURN! Pick your card(s) and play 👈</span>
              </div>
            ) : (
              <div className="py-1 px-4 rounded-full bg-slate-950/70 border border-slate-700/80 text-slate-300 text-xs text-center flex items-center justify-center gap-2 mx-auto w-fit">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>
                  Waiting for{' '}
                  <strong className="text-amber-300 font-bold">
                    {publicState.players.find((p) => p.seat === publicState.currentTurnSeat)?.displayName || 'opponent'}
                  </strong>{' '}
                  to play...
                </span>
              </div>
            )}
          </div>

          {/* Bottom Felt Spacer / Watermark showing ♦ < ♣ < ♥ < ♠ hierarchy */}
          <div className="text-[11px] font-mono tracking-widest text-emerald-400/40 uppercase select-none pointer-events-none">
            ♦ ♣ ♥ ♠ Capsa Banting Arena ♠ ♥ ♣ ♦
          </div>
        </div>
      </main>

      {/* Bottom Area: Local Player Controls & Hand - Strongly illuminated when your turn */}
      <footer className={`w-full backdrop-blur-md transition-all duration-300 z-20 ${
        isMyTurn
          ? 'bg-slate-950/95 border-t-2 border-emerald-400 shadow-[0_-12px_45px_rgba(16,185,129,0.35)] ring-2 ring-emerald-500/40'
          : 'bg-slate-950/90 border-t border-slate-800/80'
      }`}>
        <ActionBar
          hand={localHand}
          selectedCardIds={selectedCardIds}
          onToggleSelectCard={toggleSelectCard}
          onClearSelection={clearSelection}
          onSortByRank={handleSortByRank}
          onSortBySuit={handleSortBySuit}
          onPlay={onPlayCards}
          onPass={onPass}
          isTurn={isMyTurn}
          latestPlay={publicState.latestPlay}
          isFirstTrickOfGame={publicState.isFirstTrickOfGame}
          hasPassedThisTrick={Boolean(me?.passedInCurrentTrick)}
          myFinishedRank={me?.finishedRank}
        />
      </footer>

      {/* Floating Game Log & Chat */}
      <GameLog logs={publicState.logs} onSendMessage={onSendMessage} />

      {/* Game End Victory Modal */}
      {publicState.status === 'ENDED' && (
        <GameEndModal
          winnerPlayerId={publicState.winnerPlayerId}
          players={publicState.players}
          myPlayerId={myPlayerId}
          isHost={Boolean(me?.isHost)}
          bombAlert={publicState.bombAlert}
          onPlayAgain={onPlayAgain}
          onLeaveRoom={onLeaveRoom}
        />
      )}
    </div>
  );
};
