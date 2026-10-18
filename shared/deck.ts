import type { Card, Suit } from './types.js';
import { RANKS, SUITS, RANK_VALUES, DEFAULT_SUIT_VALUES, STARTING_CARD_ID } from './constants.js';

export function createStandardDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${rank}_${suit}`,
        suit,
        rank,
      });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[], rng: () => number = Math.random): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }
  return shuffled;
}

export function dealHands(shuffledDeck: Card[]): [Card[], Card[], Card[], Card[]] {
  if (shuffledDeck.length !== 52) {
    throw new Error(`Deck must contain exactly 52 cards, got ${shuffledDeck.length}`);
  }
  const hands: [Card[], Card[], Card[], Card[]] = [[], [], [], []];
  for (let i = 0; i < 52; i++) {
    hands[i % 4].push(shuffledDeck[i]);
  }
  return hands;
}

export function sortHand(
  hand: Card[],
  suitValues: Record<Suit, number> = DEFAULT_SUIT_VALUES,
  bySuitFirst = false
): Card[] {
  return [...hand].sort((a, b) => {
    if (bySuitFirst) {
      const suitDiff = suitValues[a.suit] - suitValues[b.suit];
      if (suitDiff !== 0) return suitDiff;
      return RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
    } else {
      const rankDiff = RANK_VALUES[a.rank] - RANK_VALUES[b.rank];
      if (rankDiff !== 0) return rankDiff;
      return suitValues[a.suit] - suitValues[b.suit];
    }
  });
}

export function findStartingPlayerIndex(hands: Card[][]): number {
  for (let seat = 0; seat < hands.length; seat++) {
    if (hands[seat].some((card) => card.id === STARTING_CARD_ID)) {
      return seat;
    }
  }
  return 0; // fallback if somehow missing
}
