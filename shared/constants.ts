import type { Rank, Suit } from './types.js';

export const RANKS: readonly Rank[] = [
  '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A', '2'
] as const;

export const SUITS: readonly Suit[] = ['C', 'D', 'H', 'S'] as const;

export const RANK_VALUES: Record<Rank, number> = {
  '3': 0,
  '4': 1,
  '5': 2,
  '6': 3,
  '7': 4,
  '8': 5,
  '9': 6,
  '10': 7,
  'J': 8,
  'Q': 9,
  'K': 10,
  'A': 11,
  '2': 12,
};

export const DEFAULT_SUIT_VALUES: Record<Suit, number> = {
  'C': 0, // Clubs (lowest)
  'D': 1, // Diamonds
  'H': 2, // Hearts
  'S': 3, // Spades (highest)
};

export const SUIT_SYMBOLS: Record<Suit, string> = {
  'C': '♣',
  'D': '♦',
  'H': '♥',
  'S': '♠',
};

export const SUIT_NAMES: Record<Suit, string> = {
  'C': 'Clubs',
  'D': 'Diamonds',
  'H': 'Hearts',
  'S': 'Spades',
};

export const RANK_NAMES: Record<Rank, string> = {
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  'J': 'Jack',
  'Q': 'Queen',
  'K': 'King',
  'A': 'Ace',
  '2': '2',
};

export const STARTING_CARD_ID = '3_S'; // 3 of Spades
