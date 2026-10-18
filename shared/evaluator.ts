import type { Card, CardCombination, GameSettings, Rank, Suit } from './types.js';
import {
  DEFAULT_SUIT_VALUES,
  RANK_NAMES,
  RANK_VALUES,
  STARTING_CARD_ID,
  SUIT_SYMBOLS,
} from './constants.js';

export function detectCombination(
  cards: Card[],
  suitValues: Record<Suit, number> = DEFAULT_SUIT_VALUES
): CardCombination | null {
  if (!cards || cards.length === 0) return null;

  const count = cards.length;

  // 1 Card: Single
  if (count === 1) {
    const card = cards[0];
    const rankVal = RANK_VALUES[card.rank];
    const suitVal = suitValues[card.suit];
    return {
      type: 'SINGLE',
      cardCount: 1,
      cards: [card],
      primaryRankValue: rankVal,
      suitValue: suitVal,
      displayName: `Single ${card.rank}${SUIT_SYMBOLS[card.suit]}`,
    };
  }

  // 2 Cards: Pair
  if (count === 2) {
    if (cards[0].rank === cards[1].rank) {
      const rankVal = RANK_VALUES[cards[0].rank];
      const maxSuitVal = Math.max(suitValues[cards[0].suit], suitValues[cards[1].suit]);
      return {
        type: 'PAIR',
        cardCount: 2,
        cards,
        primaryRankValue: rankVal,
        suitValue: maxSuitVal,
        displayName: `Pair of ${RANK_NAMES[cards[0].rank]}s`,
      };
    }
    return null;
  }

  // 3 Cards: Three of a Kind OR Three-Card Straight Flush
  if (count === 3) {
    // Check Three of a Kind
    if (cards[0].rank === cards[1].rank && cards[1].rank === cards[2].rank) {
      const rankVal = RANK_VALUES[cards[0].rank];
      const maxSuitVal = Math.max(
        suitValues[cards[0].suit],
        suitValues[cards[1].suit],
        suitValues[cards[2].suit]
      );
      return {
        type: 'THREE_OF_A_KIND',
        cardCount: 3,
        cards,
        primaryRankValue: rankVal,
        suitValue: maxSuitVal,
        displayName: `Three of a Kind (${RANK_NAMES[cards[0].rank]}s)`,
      };
    }

    // Check Three-Card Straight Flush
    if (cards[0].suit === cards[1].suit && cards[1].suit === cards[2].suit) {
      const sorted = [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);
      const v0 = RANK_VALUES[sorted[0].rank];
      const v1 = RANK_VALUES[sorted[1].rank];
      const v2 = RANK_VALUES[sorted[2].rank];

      if (v1 === v0 + 1 && v2 === v1 + 1) {
        const highestCard = sorted[2];
        return {
          type: 'THREE_CARD_STRAIGHT_FLUSH',
          cardCount: 3,
          cards: sorted,
          primaryRankValue: v2,
          suitValue: suitValues[highestCard.suit],
          displayName: `3-Card Straight Flush (${sorted[0].rank}-${sorted[1].rank}-${sorted[2].rank}${SUIT_SYMBOLS[highestCard.suit]})`,
        };
      }
    }

    return null;
  }

  // 4 Cards: Four of a Kind (Bomb) OR Double Pair
  if (count === 4) {
    // Check Four of a Kind (Bomb)
    if (
      cards[0].rank === cards[1].rank &&
      cards[1].rank === cards[2].rank &&
      cards[2].rank === cards[3].rank
    ) {
      const rankVal = RANK_VALUES[cards[0].rank];
      return {
        type: 'BOMB_FOUR_OF_A_KIND',
        cardCount: 4,
        cards,
        primaryRankValue: rankVal,
        suitValue: 3,
        displayName: `Four of a Kind Bomb (${RANK_NAMES[cards[0].rank]}s)`,
      };
    }

    // Check Double Pair (two consecutive pairs)
    const rankCounts: Record<Rank, Card[]> = {} as any;
    for (const c of cards) {
      rankCounts[c.rank] = rankCounts[c.rank] || [];
      rankCounts[c.rank].push(c);
    }
    const distinctRanks = Object.keys(rankCounts) as Rank[];

    if (distinctRanks.length === 2 && rankCounts[distinctRanks[0]].length === 2) {
      const sortedRanks = distinctRanks.sort(
        (a, b) => RANK_VALUES[a] - RANK_VALUES[b]
      );
      const lowVal = RANK_VALUES[sortedRanks[0]];
      const highVal = RANK_VALUES[sortedRanks[1]];

      if (highVal === lowVal + 1) {
        const higherPairCards = rankCounts[sortedRanks[1]];
        const maxSuitInHighPair = Math.max(
          suitValues[higherPairCards[0].suit],
          suitValues[higherPairCards[1].suit]
        );
        return {
          type: 'DOUBLE_PAIR',
          cardCount: 4,
          cards,
          primaryRankValue: highVal,
          secondaryRankValue: lowVal,
          suitValue: maxSuitInHighPair,
          displayName: `Double Pair (${sortedRanks[0]}-${sortedRanks[0]} & ${sortedRanks[1]}-${sortedRanks[1]})`,
        };
      }
    }

    return null;
  }

  // 5 Cards: Five-Card Straight Flush (Bomb), Full House (Polo), or Polo Seri
  if (count === 5) {
    // Check Five-Card Straight Flush (Bomb)
    const sameSuit = cards.every((c) => c.suit === cards[0].suit);
    if (sameSuit) {
      const sorted = [...cards].sort((a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]);
      let isConsecutive = true;
      for (let i = 1; i < 5; i++) {
        if (RANK_VALUES[sorted[i].rank] !== RANK_VALUES[sorted[i - 1].rank] + 1) {
          isConsecutive = false;
          break;
        }
      }
      if (isConsecutive) {
        const highCard = sorted[4];
        return {
          type: 'BOMB_STRAIGHT_FLUSH',
          cardCount: 5,
          cards: sorted,
          primaryRankValue: RANK_VALUES[highCard.rank],
          suitValue: suitValues[highCard.suit],
          displayName: `Straight Flush Bomb (${sorted[0].rank}-${sorted[4].rank}${SUIT_SYMBOLS[highCard.suit]})`,
        };
      }
    }

    // Check Full House (Polo)
    const rankCounts: Record<string, Card[]> = {};
    for (const c of cards) {
      rankCounts[c.rank] = rankCounts[c.rank] || [];
      rankCounts[c.rank].push(c);
    }
    const distinctRanks = Object.keys(rankCounts);

    if (distinctRanks.length === 2) {
      const counts = [rankCounts[distinctRanks[0]].length, rankCounts[distinctRanks[1]].length];
      if ((counts[0] === 3 && counts[1] === 2) || (counts[0] === 2 && counts[1] === 3)) {
        const tripleRank = (counts[0] === 3 ? distinctRanks[0] : distinctRanks[1]) as Rank;
        const pairRank = (counts[0] === 2 ? distinctRanks[0] : distinctRanks[1]) as Rank;

        return {
          type: 'FULL_HOUSE',
          cardCount: 5,
          cards,
          primaryRankValue: RANK_VALUES[tripleRank],
          secondaryRankValue: RANK_VALUES[pairRank],
          suitValue: 0,
          displayName: `Polo / Full House (${RANK_NAMES[tripleRank]}s full of ${RANK_NAMES[pairRank]}s)`,
        };
      }
    }

    // Check Polo Seri: 3 consecutive cards of same suit + 1 pair of another rank
    // Try each rank that has at least 2 cards as the pair
    for (const pairRankCandidate of distinctRanks) {
      if (rankCounts[pairRankCandidate].length >= 2) {
        // Potential pair cards
        const pairCards = rankCounts[pairRankCandidate].slice(0, 2);
        // Remaining 3 cards
        const remaining = cards.filter(
          (c) => !pairCards.some((pc) => pc.id === c.id)
        );

        if (remaining.length === 3) {
          // Check if remaining cards have same suit
          if (remaining[0].suit === remaining[1].suit && remaining[1].suit === remaining[2].suit) {
            // Check if remaining ranks do not include pairRank
            const suitedRanks = remaining.map((c) => c.rank);
            if (!suitedRanks.includes(pairRankCandidate as Rank)) {
              // Check if consecutive
              const sortedSuited = [...remaining].sort(
                (a, b) => RANK_VALUES[a.rank] - RANK_VALUES[b.rank]
              );
              const v0 = RANK_VALUES[sortedSuited[0].rank];
              const v1 = RANK_VALUES[sortedSuited[1].rank];
              const v2 = RANK_VALUES[sortedSuited[2].rank];

              if (v1 === v0 + 1 && v2 === v1 + 1) {
                const highSuitedCard = sortedSuited[2];
                return {
                  type: 'POLO_SERI',
                  cardCount: 5,
                  cards: [...sortedSuited, ...pairCards],
                  primaryRankValue: v2,
                  secondaryRankValue: RANK_VALUES[pairRankCandidate as Rank],
                  suitValue: suitValues[highSuitedCard.suit],
                  displayName: `Polo Seri (${sortedSuited[0].rank}-${sortedSuited[1].rank}-${sortedSuited[2].rank}${SUIT_SYMBOLS[highSuitedCard.suit]} + Pair of ${pairRankCandidate}s)`,
                };
              }
            }
          }
        }
      }
    }

    return null;
  }

  return null;
}

export function isSingleTwo(play: CardCombination | null): boolean {
  return play !== null && play.type === 'SINGLE' && play.cards[0].rank === '2';
}

export function isBomb(play: CardCombination | null): boolean {
  return (
    play !== null &&
    (play.type === 'BOMB_FOUR_OF_A_KIND' || play.type === 'BOMB_STRAIGHT_FLUSH')
  );
}

export function canBeat(
  currentPlay: CardCombination,
  newPlay: CardCombination,
  settings?: GameSettings
): { valid: boolean; reason?: string } {
  const bombStraightFlushBeatsFour =
    settings?.bombStraightFlushBeatsFourOfAKind ?? true;

  // Case 1: Challenging a Single 2
  if (isSingleTwo(currentPlay)) {
    // Normal Single 2 beat by higher suit Single 2
    if (newPlay.type === 'SINGLE' && newPlay.cards[0].rank === '2') {
      if (newPlay.suitValue > currentPlay.suitValue) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: 'A 2 must have a higher suit rank to beat the current 2',
      };
    }

    // Bombed by Four of a Kind or Straight Flush
    if (isBomb(newPlay)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: 'A Single 2 can only be challenged by a higher Single 2 or a Bomb (4-of-a-kind or Straight Flush)',
    };
  }

  // Case 2: Challenging an already-played Bomb (if another player responds to a bomb)
  if (isBomb(currentPlay)) {
    if (!isBomb(newPlay)) {
      return { valid: false, reason: 'Only a higher Bomb can challenge a Bomb' };
    }

    // If current is Four of a Kind
    if (currentPlay.type === 'BOMB_FOUR_OF_A_KIND') {
      if (newPlay.type === 'BOMB_STRAIGHT_FLUSH') {
        return bombStraightFlushBeatsFour
          ? { valid: true }
          : { valid: false, reason: 'Straight Flush bomb does not beat Four of a Kind per rules' };
      }
      if (newPlay.type === 'BOMB_FOUR_OF_A_KIND') {
        if (newPlay.primaryRankValue > currentPlay.primaryRankValue) {
          return { valid: true };
        }
        return { valid: false, reason: 'Must be a higher ranked Four of a Kind' };
      }
    }

    // If current is Straight Flush Bomb
    if (currentPlay.type === 'BOMB_STRAIGHT_FLUSH') {
      if (newPlay.type === 'BOMB_FOUR_OF_A_KIND') {
        return { valid: false, reason: 'Four of a Kind cannot beat a Straight Flush Bomb' };
      }
      if (newPlay.type === 'BOMB_STRAIGHT_FLUSH') {
        if (newPlay.primaryRankValue > currentPlay.primaryRankValue) {
          return { valid: true };
        }
        if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
          if (newPlay.suitValue > currentPlay.suitValue) {
            return { valid: true };
          }
        }
        return { valid: false, reason: 'Must be a higher Straight Flush' };
      }
    }
  }

  // Case 3: Standard Play - Must match combination type and card count
  if (newPlay.type !== currentPlay.type || newPlay.cardCount !== currentPlay.cardCount) {
    return {
      valid: false,
      reason: `Must play the same combination type (${currentPlay.displayName}) with ${currentPlay.cardCount} cards`,
    };
  }

  switch (currentPlay.type) {
    case 'SINGLE': {
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        if (newPlay.suitValue > currentPlay.suitValue) return { valid: true };
        return { valid: false, reason: 'Lower or equal suit' };
      }
      return { valid: false, reason: 'Must play a higher ranked card' };
    }

    case 'PAIR': {
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        if (newPlay.suitValue > currentPlay.suitValue) return { valid: true };
        return { valid: false, reason: 'Lower or equal suit in pair' };
      }
      return { valid: false, reason: 'Must play a higher ranked pair' };
    }

    case 'THREE_OF_A_KIND': {
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      return { valid: false, reason: 'Must play a higher ranked Three of a Kind' };
    }

    case 'DOUBLE_PAIR': {
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        if (newPlay.suitValue > currentPlay.suitValue) return { valid: true };
        return { valid: false, reason: 'Lower or equal suit in double pair' };
      }
      return { valid: false, reason: 'Must play a higher ranked double pair' };
    }

    case 'FULL_HOUSE': {
      // Primary: triple rank. Tiebreaker: pair rank
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        const newSec = newPlay.secondaryRankValue ?? 0;
        const curSec = currentPlay.secondaryRankValue ?? 0;
        if (newSec > curSec) return { valid: true };
        return { valid: false, reason: 'Lower or equal pair in Full House' };
      }
      return { valid: false, reason: 'Must play a higher Full House (triple rank)' };
    }

    case 'POLO_SERI': {
      // Primary: highest card in suited sequence. Tiebreaker 1: suit. Tiebreaker 2: pair rank
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        if (newPlay.suitValue > currentPlay.suitValue) return { valid: true };
        if (newPlay.suitValue === currentPlay.suitValue) {
          const newSec = newPlay.secondaryRankValue ?? 0;
          const curSec = currentPlay.secondaryRankValue ?? 0;
          if (newSec > curSec) return { valid: true };
        }
        return { valid: false, reason: 'Lower or equal Polo Seri' };
      }
      return { valid: false, reason: 'Must play a higher Polo Seri' };
    }

    case 'THREE_CARD_STRAIGHT_FLUSH': {
      // Primary: highest card. Tiebreaker: suit
      if (newPlay.primaryRankValue > currentPlay.primaryRankValue) return { valid: true };
      if (newPlay.primaryRankValue === currentPlay.primaryRankValue) {
        if (newPlay.suitValue > currentPlay.suitValue) return { valid: true };
        return { valid: false, reason: 'Lower suit in Straight Flush' };
      }
      return { valid: false, reason: 'Must play a higher 3-Card Straight Flush' };
    }

    default:
      return { valid: false, reason: 'Unsupported combination type' };
  }
}

export function isValidLeadPlay(
  play: CardCombination,
  isFirstTrickOfGame: boolean
): { valid: boolean; reason?: string } {
  // If first trick of the first game, must contain 3 of Spades
  if (isFirstTrickOfGame) {
    const hasThreeOfSpades = play.cards.some((c) => c.id === STARTING_CARD_ID);
    if (!hasThreeOfSpades) {
      return {
        valid: false,
        reason: 'The first play of the game must include the 3 of Spades (3♠)',
      };
    }
  }

  if (play.type === 'BOMB_FOUR_OF_A_KIND' || play.type === 'BOMB_STRAIGHT_FLUSH') {
    return {
      valid: false,
      reason: 'Bombs are reserved counterplays against a Single 2 and cannot be led as an opening play',
    };
  }

  return { valid: true };
}
