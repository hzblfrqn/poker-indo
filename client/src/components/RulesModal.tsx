import React from 'react';
import { X, BookOpen, Flame, Sparkles } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden text-slate-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-gold font-display text-lg font-bold">
            <BookOpen size={20} />
            Indonesian Poker (Capsa Banting) Rules
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm leading-relaxed">
          {/* Card & Suit Ranking */}
          <section className="space-y-2">
            <h3 className="font-bold text-amber-300 text-base flex items-center gap-2">
              <Sparkles size={16} /> 1. Card & Suit Ranking
            </h3>
            <p className="text-slate-300">
              Card ranks from lowest to highest:
            </p>
            <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-center text-xs sm:text-sm border border-slate-800 text-emerald-400 font-bold">
              3 &lt; 4 &lt; 5 &lt; 6 &lt; 7 &lt; 8 &lt; 9 &lt; 10 &lt; J &lt; Q &lt; K &lt; A &lt; 2
            </div>
            <p className="text-xs text-slate-400">
              <strong>2 is the highest individual card</strong>, and <strong>3 is the lowest</strong>.
            </p>
            <p className="text-slate-300 mt-2">
              Suits rank from lowest to highest (for tie-breaking):
            </p>
            <div className="p-2 rounded-lg bg-slate-950 font-mono text-center text-xs border border-slate-800 text-slate-200">
              ♦ Diamonds (lowest) &lt; ♣ Clubs &lt; ♥ Hearts &lt; ♠ Spades (highest)
            </div>
          </section>

          {/* Starting Play */}
          <section className="space-y-2">
            <h3 className="font-bold text-amber-300 text-base">2. Starting the Game (Opening 3s)</h3>
            <p className="text-slate-300">
              On the <strong>very first game of the room</strong>, every player places their 3s on the table. The player who held the <strong>3 of Spades (3♠)</strong> leads the first trick with any combination from their hand.
            </p>
            <p className="text-amber-200 text-xs">
              <strong>Rematch Rule:</strong> The 3s rule applies <em>only</em> to the very first game! In subsequent games in the room, everyone keeps all 13 cards dealt to them, and the <strong>winner of the previous game</strong> goes first.
            </p>
          </section>

          {/* Turn Mechanics & Passing */}
          <section className="space-y-2">
            <h3 className="font-bold text-amber-300 text-base">3. Turns & Passing</h3>
            <p className="text-slate-300">
              Play proceeds clockwise. A player must either challenge the current play with a higher combination of the <strong>exact same type and card count</strong>, or pass.
            </p>
            <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-xs text-red-200">
              <strong>Passing Rule:</strong> Once a player passes in a trick, they <em>cannot re-enter</em> that trick. When all other active players pass, the last player to make a play wins the trick and leads the next trick.
            </div>
          </section>

          {/* Valid Combinations */}
          <section className="space-y-3">
            <h3 className="font-bold text-amber-300 text-base">4. Valid Combinations</h3>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Single (1 Card):</strong> Higher rank beats lower. Ties broken by suit (♠ beats ♥ beats ♣ beats ♦).
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Pair (2 Cards):</strong> Two cards of identical rank (e.g. 8♦ 8♠). Higher pair rank beats lower.
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Three of a Kind (3 Cards):</strong> Three cards of identical rank (e.g. J♣ J♦ J♠).
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Double Pair (4 Cards):</strong> Two pairs of <em>consecutive</em> ranks (e.g. 5-5 & 6-6, 9-9 & 10-10, A-A & 2-2). Non-consecutive pairs (e.g. 5-5 & 7-7) are invalid!
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Full House / Polo (5 Cards):</strong> 3 cards of one rank + 2 cards of another (e.g. J-J-J 8-8). Triple rank determines strength.
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Polo Seri (5 Cards):</strong> 3 consecutive cards of the same suit + 1 pair of another rank (e.g. 4♠-5♠-6♠ with 10♣-10♦). Suited sequence highest card determines strength.
              </li>
              <li className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800">
                <strong className="text-white">Three-Card Straight Flush (3 Cards):</strong> 3 consecutive cards sharing the same suit (e.g. 6♠-7♠-8♠).
              </li>
            </ul>
          </section>

          {/* Bomb Mechanics */}
          <section className="space-y-2 p-3 rounded-xl bg-amber-950/30 border border-amber-600/40">
            <h3 className="font-bold text-amber-400 text-base flex items-center gap-2">
              <Flame size={18} className="text-amber-500 animate-pulse" />
              5. Bombing a Single 2
            </h3>
            <p className="text-xs sm:text-sm text-slate-200">
              When a player plays a <strong>Single 2</strong>, another player can counter it with a <strong>Bomb</strong>!
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-2">
              <div className="p-2 rounded bg-slate-900 border border-slate-700">
                <span className="font-bold text-amber-300">Four of a Kind (4 Cards):</span> Four cards of identical rank (e.g. J♣ J♦ J♥ J♠).
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-700">
                <span className="font-bold text-amber-300">Five-Card Straight Flush (5 Cards):</span> Five consecutive cards of identical suit (e.g. 5♠ 6♠ 7♠ 8♠ 9♠).
              </div>
            </div>
            <p className="text-xs text-rose-300 font-bold mt-2">
              💥 Instant Knockout: When a Single 2 is bombed, the game ends immediately! The player who played the Single 2 loses (4th Place), and the bomber wins 1st Place!
            </p>
          </section>

          {/* Winning */}
          <section className="space-y-2">
            <h3 className="font-bold text-emerald-400 text-base">6. Winning the Game</h3>
            <p className="text-slate-300">
              The first player to play all 13 cards from their hand wins the game immediately!
            </p>
          </section>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gold hover:bg-yellow-400 text-slate-950 font-bold text-sm transition-colors cursor-pointer"
          >
            Got it, Let's Play!
          </button>
        </div>
      </div>
    </div>
  );
};
