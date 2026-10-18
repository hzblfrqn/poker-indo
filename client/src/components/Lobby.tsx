import React, { useState } from 'react';
import type { GameStatePublic, PlayerPublic, PlayerSeat } from '@shared/types';
import {
  Copy,
  Check,
  Crown,
  Play,
  UserCheck,
  UserX,
  ArrowRightLeft,
  Volume2,
  VolumeX,
  BookOpen,
  ArrowLeft,
  Bot,
  UserPlus,
  Trash2,
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface LobbyProps {
  roomState: GameStatePublic;
  myPlayerId: string;
  onReadyToggle: (isReady: boolean) => void;
  onSwitchSeat: (seat: PlayerSeat) => void;
  onAddBot: (seat?: PlayerSeat) => void;
  onRemoveBot: (seat: PlayerSeat) => void;
  onLeaveRoom: () => void;
  onStartGame: () => void;
  onOpenRules: () => void;
}

export const Lobby: React.FC<LobbyProps> = ({
  roomState,
  myPlayerId,
  onReadyToggle,
  onSwitchSeat,
  onAddBot,
  onRemoveBot,
  onLeaveRoom,
  onStartGame,
  onOpenRules,
}) => {
  const [copied, setCopied] = useState(false);
  const [muted, setMuted] = useState(!sounds.enabled);

  const me = roomState.players.find((p) => p.id === myPlayerId);
  const isHost = me?.isHost ?? false;
  const isReady = me?.isReady ?? false;

  const totalPlayers = roomState.players.length;
  const readyPlayers = roomState.players.filter((p) => p.isReady).length;
  const canStart = totalPlayers === 4 && readyPlayers === 4;
  const emptySeatsCount = 4 - totalPlayers;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSound = () => {
    sounds.enabled = !sounds.enabled;
    setMuted(!sounds.enabled);
  };

  // Find player by seat
  const seatMap = new Map<PlayerSeat, PlayerPublic>();
  roomState.players.forEach((p) => seatMap.set(p.seat, p));

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center p-4 sm:p-6 animate-in fade-in duration-300">
      {/* Top Bar with Back Button, Room Code and Sound/Rules toggles */}
      <div className="w-full flex flex-wrap items-center justify-between gap-4 glass-panel p-4 rounded-2xl mb-6">
        <div className="flex items-center gap-3">
          {/* Back Button */}
          <button
            onClick={onLeaveRoom}
            className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-slate-700"
            title="Leave room and return to menu"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Leave Room</span>
          </button>

          <div>
            <span className="text-xs uppercase font-mono tracking-wider text-slate-400">Room Code</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="font-mono text-2xl sm:text-3xl font-extrabold text-gold tracking-widest">
                {roomState.roomId}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                title="Copy Room Code"
              >
                {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Add Bot button for Host if empty seats exist */}
          {isHost && emptySeatsCount > 0 && (
            <button
              onClick={() => onAddBot()}
              className="px-3 py-2 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 text-indigo-200 border border-indigo-500/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              title="Add an AI Bot to an empty seat"
            >
              <Bot size={15} />
              <span>+ Add Bot</span>
            </button>
          )}

          <button
            onClick={toggleSound}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            title={muted ? 'Unmute sounds' : 'Mute sounds'}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button
            onClick={onOpenRules}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs sm:text-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen size={16} className="text-amber-400" />
            Rules
          </button>
        </div>
      </div>

      {/* 4 Seats Container */}
      <div className="w-full mb-6">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="font-display text-lg font-bold text-slate-200 flex items-center gap-2">
            Table Seats <span className="font-mono text-sm text-gold">({totalPlayers}/4 Players)</span>
          </h2>
          <span className="text-xs text-slate-400">
            {readyPlayers}/4 players ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {([0, 1, 2, 3] as PlayerSeat[]).map((seatIndex) => {
            const player = seatMap.get(seatIndex);
            const isMe = player?.id === myPlayerId;
            const isBot = player?.isBot ?? false;

            return (
              <div
                key={seatIndex}
                className={`
                  relative flex flex-col items-center justify-between p-5 rounded-2xl border transition-all duration-200 min-h-[200px]
                  ${player
                    ? isMe
                      ? 'glass-panel-gold ring-1 ring-gold'
                      : isBot
                      ? 'glass-panel border-indigo-500/40'
                      : 'glass-panel'
                    : 'border-dashed border-slate-700 bg-slate-900/30'}
                `}
              >
                <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>SEAT {seatIndex + 1}</span>
                  {player?.isHost && (
                    <span className="flex items-center gap-1 text-gold font-bold">
                      <Crown size={13} /> HOST
                    </span>
                  )}
                  {isBot && (
                    <span className="flex items-center gap-1 text-indigo-400 font-bold bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-700">
                      <Bot size={12} /> AI BOT
                    </span>
                  )}
                </div>

                {player ? (
                  <div className="flex flex-col items-center my-2">
                    {/* Avatar */}
                    <div
                      className={`
                        w-14 h-14 rounded-full text-white font-bold text-lg flex items-center justify-center shadow-md mb-2
                        ${isBot
                          ? 'bg-gradient-to-tr from-indigo-600 to-purple-500'
                          : 'bg-gradient-to-tr from-emerald-600 to-teal-400'}
                      `}
                    >
                      {isBot ? <Bot size={24} /> : player.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Name */}
                    <span className="font-semibold text-sm text-slate-100 max-w-[150px] truncate text-center">
                      {player.displayName} {isMe ? '(You)' : ''}
                    </span>
                    {/* Ready badge */}
                    <div className="mt-2">
                      {player.isReady ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-semibold flex items-center gap-1">
                          <UserCheck size={12} /> READY
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-600 text-slate-400 text-xs font-medium flex items-center gap-1">
                          <UserX size={12} /> NOT READY
                        </span>
                      )}
                    </div>

                    {/* Host action: Remove Bot */}
                    {isHost && isBot && (
                      <button
                        onClick={() => onRemoveBot(seatIndex)}
                        className="mt-2 px-2 py-0.5 rounded-lg bg-red-950 hover:bg-red-900 border border-red-700/60 text-red-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                        title="Remove this bot"
                      >
                        <Trash2 size={11} /> Remove
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center my-auto text-center gap-2">
                    <span className="text-slate-500 text-xs">Seat Available</span>

                    {/* Add Bot button for this seat */}
                    {isHost && (
                      <button
                        onClick={() => onAddBot(seatIndex)}
                        className="px-3 py-1.5 rounded-xl bg-indigo-950 hover:bg-indigo-900 border border-indigo-600/70 text-indigo-300 hover:text-indigo-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                        title="Add bot to this seat"
                      >
                        <Bot size={13} /> Add Bot
                      </button>
                    )}

                    {/* Switch seat for human player */}
                    {me && me.seat !== seatIndex && (
                      <button
                        onClick={() => onSwitchSeat(seatIndex)}
                        className="px-2.5 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white flex items-center gap-1 transition-colors border border-slate-700 cursor-pointer"
                      >
                        <ArrowRightLeft size={12} /> Switch Here
                      </button>
                    )}
                  </div>
                )}
                <div />
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Footer (Ready Toggle & Start Game) */}
      <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 glass-panel p-5 rounded-2xl">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => onReadyToggle(!isReady)}
            className={`
              w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md
              ${isReady
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'}
            `}
          >
            {isReady ? <UserX size={18} /> : <UserCheck size={18} />}
            {isReady ? 'CANCEL READY' : "I'M READY!"}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {isHost ? (
            <button
              onClick={onStartGame}
              disabled={!canStart}
              className={`
                w-full sm:w-auto px-8 py-3 rounded-xl font-display font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg
                ${canStart
                  ? 'bg-gradient-to-r from-gold to-yellow-400 hover:from-yellow-400 hover:to-gold text-slate-950 ring-2 ring-yellow-200/50 hover:scale-105 active:scale-95 cursor-pointer shadow-glow-gold'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'}
              `}
            >
              <Play size={18} fill="currentColor" />
              START GAME
            </button>
          ) : (
            <div className="text-xs text-slate-400 text-center sm:text-right">
              {canStart
                ? 'All players ready! Waiting for room host to start...'
                : `Waiting for all 4 players to join and ready up (${readyPlayers}/4 ready)...`}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
