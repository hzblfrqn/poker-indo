import { Card, CardCombination, GameSettings, PlayedTrick } from '../../shared/types.js';
import { RANK_VALUES, STARTING_CARD_ID } from '../../shared/constants.js';
import { canBeat, detectCombination, isValidLeadPlay } from '../../shared/evaluator.js';
import { sortHand } from '../../shared/deck.js';

export const BOT_NAMES = ['Budi', 'Siti', 'Agus', 'Dewi', 'Rian', 'Maya'];

/**
 * Finds the best legal play for a bot given its hand and the current table situation.
 * Returns an array of card IDs to play, or null if the bot should pass.
 */
export function chooseBotPlay(
  hand: Card[],
  latestPlay: PlayedTrick | null,
  isFirstTrickOfGame: boolean,
  settings: GameSettings
): string[] | null {
  if (hand.length === 0) return null;

  const sortedHand = sortHand(hand);

  // CASE 1: Bot is Leading the Trick
  if (!latestPlay) {
    // If opening trick of the game, MUST play 3 of Spades
    if (isFirstTrickOfGame) {
      const card3S = hand.find((c) => c.id === STARTING_CARD_ID);
      if (!card3S) return null; // Should never happen if server assigned turn correctly

      // 1. Try to find a pair of 3s containing 3♠
      const other3 = hand.find((c) => c.rank === '3' && c.id !== STARTING_CARD_ID);
      if (other3) {
        const combo = detectCombination([card3S, other3]);
        if (combo && isValidLeadPlay(combo, true).valid) {
          return [card3S.id, other3.id];
        }
      }

      // 2. Fallback: Lead single 3♠
      const singleCombo = detectCombination([card3S]);
      if (singleCombo && isValidLeadPlay(singleCombo, true).valid) {
        return [card3S.id];
      }

      return [card3S.id];
    }

    // Normal lead: prefer playing lowest pair, lowest double pair, or lowest single (saving 2s)
    // 1. Check for lowest pair (rank <= 'J' to save big cards)
    const pairs = findAllPairs(sortedHand);
    if (pairs.length > 0 && RANK_VALUES[pairs[0][0].rank] <= RANK_VALUES['10']) {
      return pairs[0].map((c) => c.id);
    }

    // 2. Play lowest single card (excluding '2' if we have other cards)
    const nonTwos = sortedHand.filter((c) => c.rank !== '2');
    if (nonTwos.length > 0) {
      return [nonTwos[0].id];
    }

    // If only 2s left, lead the lowest 2
    return [sortedHand[0].id];
  }

  // CASE 2: Bot is Responding to an Active Play
  const targetCombo = latestPlay.combination;

  // A. Responding to a Single
  if (targetCombo.type === 'SINGLE') {
    const isSingle2 = targetCombo.cards[0].rank === '2';

    // If target is single 2, check if bot can and wants to bomb it!
    if (isSingle2) {
      const bombs = findAllBombs(sortedHand);
      if (bombs.length > 0) {
        return bombs[0].map((c) => c.id);
      }
      // Or play a higher single 2 if bot holds one
      const higherTwos = sortedHand.filter(
        (c) => c.rank === '2' && canBeat(targetCombo, detectCombination([c])!, settings).valid
      );
      if (higherTwos.length > 0) {
        return [higherTwos[0].id];
      }
      return null; // Pass on 2
    }

    // Ordinary Single: find the lowest card that beats it
    for (const card of sortedHand) {
      // Don't spend a 2 on a low card unless bot only has 1 or 2 cards left!
      if (card.rank === '2' && hand.length > 3 && targetCombo.primaryRankValue < RANK_VALUES['Q']) {
        continue;
      }
      const singleCombo = detectCombination([card]);
      if (singleCombo && canBeat(targetCombo, singleCombo, settings).valid) {
        return [card.id];
      }
    }
    return null; // Pass
  }

  // B. Responding to a Pair
  if (targetCombo.type === 'PAIR') {
    const pairs = findAllPairs(sortedHand);
    for (const pair of pairs) {
      const combo = detectCombination(pair);
      if (combo && canBeat(targetCombo, combo, settings).valid) {
        return pair.map((c) => c.id);
      }
    }
    return null;
  }

  // C. Responding to Three of a Kind
  if (targetCombo.type === 'THREE_OF_A_KIND') {
    const trios = findAllTrios(sortedHand);
    for (const trio of trios) {
      const combo = detectCombination(trio);
      if (combo && canBeat(targetCombo, combo, settings).valid) {
        return trio.map((c) => c.id);
      }
    }
    return null;
  }

  // D. Responding to Double Pair
  if (targetCombo.type === 'DOUBLE_PAIR') {
    const doublePairs = findAllDoublePairs(sortedHand);
    for (const dp of doublePairs) {
      const combo = detectCombination(dp);
      if (combo && canBeat(targetCombo, combo, settings).valid) {
        return dp.map((c) => c.id);
      }
    }
    return null;
  }

  // E. Responding to Full House (Polo)
  if (targetCombo.type === 'FULL_HOUSE') {
    const fullHouses = findAllFullHouses(sortedHand);
    for (const fh of fullHouses) {
      const combo = detectCombination(fh);
      if (combo && canBeat(targetCombo, combo, settings).valid) {
        return fh.map((c) => c.id);
      }
    }
    return null;
  }

  // Default fallback: pass if no match found
  return null;
}

// Helpers to extract combinations from sorted hand
function findAllPairs(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const grouped: Record<string, Card[]> = {};
  for (const c of hand) {
    grouped[c.rank] = grouped[c.rank] || [];
    grouped[c.rank].push(c);
  }
  for (const rank of Object.keys(grouped)) {
    if (grouped[rank].length >= 2) {
      result.push(grouped[rank].slice(0, 2));
    }
  }
  return result.sort((a, b) => RANK_VALUES[a[0].rank] - RANK_VALUES[b[0].rank]);
}

function findAllTrios(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  const grouped: Record<string, Card[]> = {};
  for (const c of hand) {
    grouped[c.rank] = grouped[c.rank] || [];
    grouped[c.rank].push(c);
  }
  for (const rank of Object.keys(grouped)) {
    if (grouped[rank].length >= 3) {
      result.push(grouped[rank].slice(0, 3));
    }
  }
  return result.sort((a, b) => RANK_VALUES[a[0].rank] - RANK_VALUES[b[0].rank]);
}

function findAllDoublePairs(hand: Card[]): Card[][] {
  const pairs = findAllPairs(hand);
  const result: Card[][] = [];
  for (let i = 0; i < pairs.length - 1; i++) {
    const p1 = pairs[i];
    const p2 = pairs[i + 1];
    if (RANK_VALUES[p2[0].rank] === RANK_VALUES[p1[0].rank] + 1) {
      result.push([...p1, ...p2]);
    }
  }
  return result;
}

function findAllFullHouses(hand: Card[]): Card[][] {
  const trios = findAllTrios(hand);
  const pairs = findAllPairs(hand);
  const result: Card[][] = [];

  for (const trio of trios) {
    for (const pair of pairs) {
      if (pair[0].rank !== trio[0].rank) {
        result.push([...trio, ...pair]);
      }
    }
  }
  return result;
}

function findAllBombs(hand: Card[]): Card[][] {
  const result: Card[][] = [];
  // 4 of a kind
  const grouped: Record<string, Card[]> = {};
  for (const c of hand) {
    grouped[c.rank] = grouped[c.rank] || [];
    grouped[c.rank].push(c);
  }
  for (const rank of Object.keys(grouped)) {
    if (grouped[rank].length === 4) {
      result.push(grouped[rank]);
    }
  }
  return result;
}
