import React, { useState, useRef, useEffect } from 'react';
import type { GameLogEntry } from '@shared/types';
import { MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import { sounds } from '../utils/audio';

interface GameLogProps {
  logs: GameLogEntry[];
  onSendMessage: (msg: string) => void;
}

export const GameLog: React.FC<GameLogProps> = ({ logs, onSendMessage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [recentChatToast, setRecentChatToast] = useState<{ id: string; text: string } | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const prevLogsLengthRef = useRef(logs.length);

  // Trigger toast & sound whenever a new chat message arrives while chatbox is closed
  useEffect(() => {
    if (logs.length > prevLogsLengthRef.current) {
      const latest = logs[logs.length - 1];
      if (latest && latest.type === 'chat') {
        sounds.playChatNotification();
        if (!isOpen) {
          setRecentChatToast({ id: latest.id, text: latest.text });
          const timer = setTimeout(() => {
            setRecentChatToast((curr) => (curr?.id === latest.id ? null : curr));
          }, 6000);
          return () => clearTimeout(timer);
        }
      }
    }
    prevLogsLengthRef.current = logs.length;
  }, [logs, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setRecentChatToast(null);
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const getLogColor = (type: GameLogEntry['type']) => {
    switch (type) {
      case 'bomb':
        return 'text-amber-400 font-bold bg-amber-950/40 border-l-2 border-amber-500';
      case 'win':
        return 'text-emerald-300 font-bold bg-emerald-950/40 border-l-2 border-emerald-500';
      case 'play':
        return 'text-slate-200 border-l-2 border-blue-500/50';
      case 'pass':
        return 'text-slate-400 italic border-l-2 border-slate-600/50';
      case 'chat':
        return 'text-purple-300 bg-purple-950/20 border-l-2 border-purple-500';
      default:
        return 'text-slate-300 border-l-2 border-slate-700';
    }
  };

  return (
    <div className="fixed bottom-4 left-4 z-40 max-w-xs sm:max-w-sm w-full">
      {/* Floating Chat Bubble Toast in the left corner above chatbox */}
      {!isOpen && recentChatToast && (
        <div
          onClick={() => {
            setIsOpen(true);
            setRecentChatToast(null);
          }}
          className="mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-purple-950/95 via-slate-900/95 to-slate-900/95 border border-purple-500/70 shadow-[0_8px_25px_rgba(168,85,247,0.35)] backdrop-blur-md cursor-pointer animate-in fade-in slide-in-from-bottom-2 duration-200 transition-all hover:scale-102 flex items-start gap-2.5"
        >
          <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-sm">
            <MessageSquare size={13} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1 mb-0.5">
              <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">New Chat</span>
              <span className="text-[9px] text-slate-400">Click to open</span>
            </div>
            <p className="text-xs text-white font-medium break-words line-clamp-2">
              {recentChatToast.text}
            </p>
          </div>
        </div>
      )}

      {/* Header bar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl bg-slate-900/95 border border-slate-700/80 text-slate-200 text-xs font-medium shadow-xl hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <MessageSquare size={14} className="text-emerald-400" />
          Game Log & Chat
          {logs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-400 font-mono">
              {logs.length}
            </span>
          )}
        </span>
        {isOpen ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
      </button>

      {/* Expanded Container */}
      {isOpen && (
        <div className="mt-1 flex flex-col h-64 rounded-xl bg-slate-950/95 border border-slate-800 backdrop-blur-md shadow-2xl overflow-hidden p-2.5">
          {/* Scrollable logs */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs font-sans">
            {logs.map((log) => (
              <div
                key={log.id}
                className={`p-1.5 rounded-r text-[11px] leading-tight ${getLogColor(log.type)}`}
              >
                {log.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          {/* Chat input */}
          <form onSubmit={handleSubmit} className="mt-2 flex gap-1.5 pt-1.5 border-t border-slate-800/80">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Send a quick message..."
              maxLength={100}
              className="flex-1 px-2.5 py-1 text-xs rounded-lg bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={!message.trim()}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition-colors cursor-pointer"
            >
              <Send size={13} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
