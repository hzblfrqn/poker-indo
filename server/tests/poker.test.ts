import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStandardDeck,
  dealHands,
  findStartingPlayerIndex,
  shuffleDeck,
  sortHand,
} from '../../shared/deck.js';
import {
  canBeat,
  detectCombination,
  isBomb,
  isSingleTwo,
  isValidLeadPlay,
} from '../../shared/evaluator.js';
import { Card, Rank, Suit } from '../../shared/types.js';
import { RANK_VALUES, DEFAULT_SUIT_VALUES, STARTING_CARD_ID } from '../../shared/constants.js';
import { Room } from '../src/Room.js';

// Helper to make card
function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}_${suit}`, rank, suit };
}

describe('1. Deck Generation and Shuffling', () => {
  it('creates exactly 52 unique cards', () => {
    const deck = createStandardDeck();
    expect(deck).toHaveLength(52);
    const idSet = new Set(deck.map((c) => c.id));
    expect(idSet.size).toBe(52);
  });

  it('deals exactly 13 cards to 4 players without duplicates', () => {
    const deck = shuffleDeck(createStandardDeck());
    const hands = dealHands(deck);
    expect(hands).toHaveLength(4);
    for (const hand of hands) {
      expect(hand).toHaveLength(13);
    }
    const allCards = hands.flat();
    const uniqueIds = new Set(allCards.map((c) => c.id));
    expect(uniqueIds.size).toBe(52);
  });

  it('correctly sorts hand by rank ascending', () => {
    const hand: Card[] = [
      makeCard('2', 'S'),
      makeCard('3', 'C'),
      makeCard('K', 'H'),
      makeCard('3', 'S'),
      makeCard('10', 'D'),
    ];
    const sorted = sortHand(hand);
    expect(sorted.map((c) => c.id)).toEqual(['3_C', '3_S', '10_D', 'K_H', '2_S']);
  });
});

describe('2. Card Ranking & 3♠ Starting Player', () => {
  it('ranks 3 as lowest and 2 as highest', () => {
    expect(RANK_VALUES['3']).toBe(0);
    expect(RANK_VALUES['4']).toBe(1);
    expect(RANK_VALUES['A']).toBe(11);
    expect(RANK_VALUES['2']).toBe(12);
    expect(RANK_VALUES['2']).toBeGreaterThan(RANK_VALUES['A']);
  });

  it('suit ranking order: Diamonds < Clubs < Hearts < Spades', () => {
    expect(DEFAULT_SUIT_VALUES['D']).toBe(0);
    expect(DEFAULT_SUIT_VALUES['C']).toBe(1);
    expect(DEFAULT_SUIT_VALUES['H']).toBe(2);
    expect(DEFAULT_SUIT_VALUES['S']).toBe(3);
  });

  it('identifies the player seat holding 3♠', () => {
    const hands: Card[][] = [
      [makeCard('4', 'C'), makeCard('5', 'D')],
      [makeCard('3', 'S'), makeCard('K', 'H')],
      [makeCard('A', 'S'), makeCard('2', 'D')],
      [makeCard('10', 'C'), makeCard('J', 'H')],
    ];
    expect(findStartingPlayerIndex(hands)).toBe(1);
  });
});

describe('3. Valid and Invalid Combinations', () => {
  it('detects Single', () => {
    const combo = detectCombination([makeCard('Q', 'C')]);
    expect(combo).not.toBeNull();
    expect(combo?.type).toBe('SINGLE');
    expect(combo?.primaryRankValue).toBe(RANK_VALUES['Q']);
  });

  it('detects Pair and rejects non-pair 2 cards', () => {
    const pair = detectCombination([makeCard('8', 'D'), makeCard('8', 'S')]);
    expect(pair).not.toBeNull();
    expect(pair?.type).toBe('PAIR');

    const nonPair = detectCombination([makeCard('8', 'D'), makeCard('9', 'S')]);
    expect(nonPair).toBeNull();
  });

  it('detects Three of a Kind', () => {
    const trio = detectCombination([makeCard('J', 'C'), makeCard('J', 'D'), makeCard('J', 'S')]);
    expect(trio).not.toBeNull();
    expect(trio?.type).toBe('THREE_OF_A_KIND');
    expect(trio?.primaryRankValue).toBe(RANK_VALUES['J']);
  });

  it('detects Three-Card Straight Flush', () => {
    const sf = detectCombination([makeCard('6', 'S'), makeCard('7', 'S'), makeCard('8', 'S')]);
    expect(sf).not.toBeNull();
    expect(sf?.type).toBe('THREE_CARD_STRAIGHT_FLUSH');
    expect(sf?.primaryRankValue).toBe(RANK_VALUES['8']);
    expect(sf?.suitValue).toBe(DEFAULT_SUIT_VALUES['S']);

    // Non-suited straight is rejected for 3 cards
    const nonSuited = detectCombination([makeCard('6', 'S'), makeCard('7', 'H'), makeCard('8', 'S')]);
    expect(nonSuited).toBeNull();

    // Non-consecutive is rejected
    const nonConsecutive = detectCombination([makeCard('6', 'S'), makeCard('8', 'S'), makeCard('9', 'S')]);
    expect(nonConsecutive).toBeNull();
  });

  it('detects Double Pair (consecutive pairs) and rejects non-consecutive', () => {
    // 5-5 and 6-6 (consecutive)
    const doublePair = detectCombination([
      makeCard('5', 'C'),
      makeCard('5', 'D'),
      makeCard('6', 'H'),
      makeCard('6', 'S'),
    ]);
    expect(doublePair).not.toBeNull();
    expect(doublePair?.type).toBe('DOUBLE_PAIR');
    expect(doublePair?.primaryRankValue).toBe(RANK_VALUES['6']);

    // 5-5 and 7-7 (non-consecutive -> invalid)
    const invalidDoublePair = detectCombination([
      makeCard('5', 'C'),
      makeCard('5', 'D'),
      makeCard('7', 'H'),
      makeCard('7', 'S'),
    ]);
    expect(invalidDoublePair).toBeNull();
  });

  it('detects Full House (Polo)', () => {
    const polo = detectCombination([
      makeCard('J', 'C'),
      makeCard('J', 'D'),
      makeCard('J', 'S'),
      makeCard('8', 'C'),
      makeCard('8', 'D'),
    ]);
    expect(polo).not.toBeNull();
    expect(polo?.type).toBe('FULL_HOUSE');
    expect(polo?.primaryRankValue).toBe(RANK_VALUES['J']);
    expect(polo?.secondaryRankValue).toBe(RANK_VALUES['8']);
  });

  it('detects Polo Seri (3 consecutive suited cards + 1 pair of different rank)', () => {
    const poloSeri = detectCombination([
      makeCard('4', 'S'),
      makeCard('5', 'S'),
      makeCard('6', 'S'),
      makeCard('10', 'C'),
      makeCard('10', 'D'),
    ]);
    expect(poloSeri).not.toBeNull();
    expect(poloSeri?.type).toBe('POLO_SERI');
    expect(poloSeri?.primaryRankValue).toBe(RANK_VALUES['6']);
    expect(poloSeri?.secondaryRankValue).toBe(RANK_VALUES['10']);
  });

  it('detects Bombs: Four of a Kind and 5-Card Straight Flush', () => {
    const quad = detectCombination([
      makeCard('J', 'C'),
      makeCard('J', 'D'),
      makeCard('J', 'H'),
      makeCard('J', 'S'),
    ]);
    expect(quad).not.toBeNull();
    expect(quad?.type).toBe('BOMB_FOUR_OF_A_KIND');
    expect(isBomb(quad)).toBe(true);

    const sfBomb = detectCombination([
      makeCard('5', 'S'),
      makeCard('6', 'S'),
      makeCard('7', 'S'),
      makeCard('8', 'S'),
      makeCard('9', 'S'),
    ]);
    expect(sfBomb).not.toBeNull();
    expect(sfBomb?.type).toBe('BOMB_STRAIGHT_FLUSH');
    expect(isBomb(sfBomb)).toBe(true);
  });
});

describe('4. Combination Comparisons & CanBeat Engine', () => {
  it('compares Singles by rank then suit', () => {
    const single10 = detectCombination([makeCard('10', 'C')])!;
    const singleJ = detectCombination([makeCard('J', 'C')])!;
    const single10Spades = detectCombination([makeCard('10', 'S')])!;

    expect(canBeat(single10, singleJ).valid).toBe(true);
    expect(canBeat(singleJ, single10).valid).toBe(false);
    expect(canBeat(single10, single10Spades).valid).toBe(true);
  });

  it('compares Pairs by rank', () => {
    const pair5 = detectCombination([makeCard('5', 'C'), makeCard('5', 'D')])!;
    const pair8 = detectCombination([makeCard('8', 'H'), makeCard('8', 'S')])!;
    expect(canBeat(pair5, pair8).valid).toBe(true);
    expect(canBeat(pair8, pair5).valid).toBe(false);
  });

  it('compares Double Pairs by higher pair rank', () => {
    const dp56 = detectCombination([
      makeCard('5', 'C'),
      makeCard('5', 'D'),
      makeCard('6', 'H'),
      makeCard('6', 'S'),
    ])!;
    const dp910 = detectCombination([
      makeCard('9', 'C'),
      makeCard('9', 'D'),
      makeCard('10', 'H'),
      makeCard('10', 'S'),
    ])!;
    expect(canBeat(dp56, dp910).valid).toBe(true);
    expect(canBeat(dp910, dp56).valid).toBe(false);
  });

  it('compares Full Houses by triple rank', () => {
    const polo7 = detectCombination([
      makeCard('7', 'C'),
      makeCard('7', 'D'),
      makeCard('7', 'H'),
      makeCard('K', 'C'),
      makeCard('K', 'D'),
    ])!;
    const poloJ = detectCombination([
      makeCard('J', 'C'),
      makeCard('J', 'D'),
      makeCard('J', 'H'),
      makeCard('8', 'C'),
      makeCard('8', 'D'),
    ])!;
    expect(canBeat(polo7, poloJ).valid).toBe(true);
    expect(canBeat(poloJ, polo7).valid).toBe(false);
  });

  it('disallows beating a pair with a single or different combo', () => {
    const pair = detectCombination([makeCard('5', 'C'), makeCard('5', 'D')])!;
    const single2 = detectCombination([makeCard('2', 'S')])!;
    expect(canBeat(pair, single2).valid).toBe(false);
  });
});

describe('5. Bombing Mechanics', () => {
  it('allows Bomb against Single 2', () => {
    const single2 = detectCombination([makeCard('2', 'H')])!;
    const bombQuad = detectCombination([
      makeCard('9', 'C'),
      makeCard('9', 'D'),
      makeCard('9', 'H'),
      makeCard('9', 'S'),
    ])!;
    const bombSF = detectCombination([
      makeCard('5', 'S'),
      makeCard('6', 'S'),
      makeCard('7', 'S'),
      makeCard('8', 'S'),
      makeCard('9', 'S'),
    ])!;

    expect(isSingleTwo(single2)).toBe(true);
    expect(canBeat(single2, bombQuad).valid).toBe(true);
    expect(canBeat(single2, bombSF).valid).toBe(true);
  });

  it('disallows ordinary cards or bombs on other single cards', () => {
    const singleK = detectCombination([makeCard('K', 'S')])!;
    const bombQuad = detectCombination([
      makeCard('9', 'C'),
      makeCard('9', 'D'),
      makeCard('9', 'H'),
      makeCard('9', 'S'),
    ])!;
    expect(canBeat(singleK, bombQuad).valid).toBe(false);
  });

  it('allows higher Bomb to beat lower Bomb', () => {
    const bombQuad8 = detectCombination([
      makeCard('8', 'C'),
      makeCard('8', 'D'),
      makeCard('8', 'H'),
      makeCard('8', 'S'),
    ])!;
    const bombQuadK = detectCombination([
      makeCard('K', 'C'),
      makeCard('K', 'D'),
      makeCard('K', 'H'),
      makeCard('K', 'S'),
    ])!;
    const bombSF = detectCombination([
      makeCard('5', 'H'),
      makeCard('6', 'H'),
      makeCard('7', 'H'),
      makeCard('8', 'H'),
      makeCard('9', 'H'),
    ])!;

    expect(canBeat(bombQuad8, bombQuadK).valid).toBe(true);
    expect(canBeat(bombQuadK, bombQuad8).valid).toBe(false);
    expect(canBeat(bombQuadK, bombSF).valid).toBe(true);
  });
});

describe('6. First Trick 3♠ Lead Validation', () => {
  it('requires 3♠ in opening play of first trick', () => {
    const playWithout3S = detectCombination([makeCard('4', 'C')])!;
    expect(isValidLeadPlay(playWithout3S, true).valid).toBe(false);

    const playWith3S = detectCombination([makeCard('3', 'S')])!;
    expect(isValidLeadPlay(playWith3S, true).valid).toBe(true);

    const pairWith3S = detectCombination([makeCard('3', 'S'), makeCard('3', 'D')])!;
    expect(isValidLeadPlay(pairWith3S, true).valid).toBe(true);
  });

  it('does not require 3♠ on subsequent tricks', () => {
    const playWithout3S = detectCombination([makeCard('4', 'C')])!;
    expect(isValidLeadPlay(playWithout3S, false).valid).toBe(true);
  });
});

describe('7. Server Room State, Turns, Passing & Win Lifecycle', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room('TEST01');
    room.joinPlayer('sock1', 'Alice', 0);
    room.joinPlayer('sock2', 'Bob', 1);
    room.joinPlayer('sock3', 'Charlie', 2);
    room.joinPlayer('sock4', 'Diana', 3);
  });

  it('manages 4 seats and prevents 5th player', () => {
    expect(room.getPlayerCount()).toBe(4);
    expect(() => room.joinPlayer('sock5', 'Eve')).toThrow('Room is full');
  });

  it('requires all players ready to start game', () => {
    const p1 = room.getPlayerBySeat(0)!;
    const p2 = room.getPlayerBySeat(1)!;
    const p3 = room.getPlayerBySeat(2)!;
    const p4 = room.getPlayerBySeat(3)!;

    room.setReady(p1.id, true);
    room.setReady(p2.id, true);
    room.setReady(p3.id, true);
    expect(room.canStartGame()).toBe(false);

    room.setReady(p4.id, true);
    expect(room.canStartGame()).toBe(true);

    room.startGame();
    expect(room.status).toBe('PLAYING');
  });

  it('places all 3s on table during opening phase and starts on the 3♠ holder', () => {
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();

    // Verify all four 3s were placed in the opening showcase
    expect(room.openingThreesShowcase).toHaveLength(4);
    const has3SInOpening = room.openingThreesShowcase?.some((t) => t.card.id === STARTING_CARD_ID);
    expect(has3SInOpening).toBe(true);

    // Hands no longer contain 3s
    for (let s = 0; s < 4; s++) {
      const p = room.getPlayerBySeat(s as any)!;
      expect(p.hand.some((c) => c.rank === '3')).toBe(false);
    }

    const turnSeat = room.currentTurnSeat!;
    const startingPlayer = room.getPlayerBySeat(turnSeat)!;
    const winnerThree = room.openingThreesShowcase?.find((t) => t.card.id === STARTING_CARD_ID);
    expect(winnerThree?.playerName).toBe(startingPlayer.displayName);
  });

  it('prevents opponents from accessing other players hidden cards', () => {
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();

    const publicState = room.getPublicState();
    // Public state only has cardCount, no hand array!
    for (const pubPlayer of publicState.players) {
      expect((pubPlayer as any).hand).toBeUndefined();
      expect(pubPlayer.cardCount).toBeGreaterThan(0);
    }

    // Private state gives only the requested player's hand
    const p0 = room.getPlayerBySeat(0)!;
    const private0 = room.getPlayerPrivateState(p0.id);
    expect(private0.hand.length).toBeGreaterThan(0);
  });

  it('prevents a player from playing out of turn', () => {
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();

    const notTurnSeat = ((room.currentTurnSeat! + 1) % 4) as any;
    const notTurnPlayer = room.getPlayerBySeat(notTurnSeat)!;

    const res = room.playCards(notTurnPlayer.id, [notTurnPlayer.hand[0].id]);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Not your turn');
  });

  it('handles trick completion when all other players pass', () => {
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();

    const turnPlayer = room.getPlayerBySeat(room.currentTurnSeat!)!;
    // Play any card from remaining hand
    const playCard = turnPlayer.hand[0];
    const playRes = room.playCards(turnPlayer.id, [playCard.id]);
    expect(playRes.success).toBe(true);
    expect(room.getLatestPlay()?.combination.type).toBe('SINGLE');

    // Next 3 players pass
    for (let i = 0; i < 3; i++) {
      const nextP = room.getPlayerBySeat(room.currentTurnSeat!)!;
      const passRes = room.pass(nextP.id);
      expect(passRes.success).toBe(true);
    }

    // Now trick should be completed, latest play reset, and turn returns to original player
    expect(room.getLatestPlay()).toBeNull();
    expect(room.currentTurnSeat).toBe(turnPlayer.seat);
    expect(room.activeTrickSeats.size).toBe(4);
  });

  it('handles bomb resolution immediately and grants next lead to bomber', () => {
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();

    // Fabricate a Single 2 on table and a 4-of-a-kind bomb in Bob's hand
    const alice = room.getPlayerBySeat(0)!;
    const bob = room.getPlayerBySeat(1)!;

    alice.hand = [makeCard('2', 'S'), makeCard('5', 'C')];
    bob.hand = [
      makeCard('7', 'C'),
      makeCard('7', 'D'),
      makeCard('7', 'H'),
      makeCard('7', 'S'),
    ];

    room.currentTurnSeat = 0;
    room.isFirstTrickOfGame = false;
    room.activeTrickSeats = new Set([0, 1, 2, 3]);

    // Alice plays 2♠
    const alicePlay = room.playCards(alice.id, ['2_S']);
    expect(alicePlay.success).toBe(true);
    expect(room.currentTurnSeat).toBe(1);

    // Bob bombs with 7s
    const bobPlay = room.playCards(bob.id, ['7_C', '7_D', '7_H', '7_S']);
    expect(bobPlay.success).toBe(true);

    // Bombing a Single 2 ends the game immediately!
    // Bob (bomber) takes 1st Place (Winner)
    // Alice (bombed) takes 4th Place (Loser)
    expect(room.status).toBe('ENDED');
    expect(bob.finishedRank).toBe(1);
    expect(alice.finishedRank).toBe(4);
    expect(room.winnerPlayerId).toBe(bob.id);
    expect(room.bombAlert).not.toBeNull();
    expect(room.bombAlert?.bomberName).toBe('Bob');
    expect(room.bombAlert?.bombedPlayerName).toBe('Alice');

    // Test rematch in same room: 3s rule is skipped and previous winner (Bob) goes first!
    room.restartGame();
    expect(room.status).toBe('LOBBY');
    for (let s = 0; s < 4; s++) {
      room.setReady(room.getPlayerBySeat(s as any)!.id, true);
    }
    room.startGame();
    expect(room.status).toBe('PLAYING');
    // Opening 3s showcase should be null on rematch!
    expect(room.openingThreesShowcase).toBeNull();
    // Bob should have the opening turn!
    expect(room.currentTurnSeat).toBe(bob.seat);
    expect(room.trickLeadPlayerId).toBe(bob.id);
    // Everyone should keep all 13 dealt cards!
    for (const p of room.players.values()) {
      expect(p.hand.length).toBe(13);
    }
  });

  it('handles temporary disconnect and seamless reconnection', () => {
    const bob = room.getPlayerBySeat(1)!;
    const sessionToken = bob.sessionToken;

    // Disconnect Bob
    room.handleDisconnect(bob.socketId);
    expect(bob.isConnected).toBe(false);

    // Bob reconnects with same session token
    const reconnectRes = room.joinPlayer('new_socket_123', 'Bob', 1, sessionToken);
    expect(reconnectRes.isReconnect).toBe(true);
    expect(bob.isConnected).toBe(true);
    expect(bob.socketId).toBe('new_socket_123');
  });

  it('continues game after 1st and 2nd place until 3rd place finishes, leaving exactly 1 loser (4th place)', () => {
    const alice = room.getPlayerBySeat(0)!;
    const bob = room.getPlayerBySeat(1)!;
    const charlie = room.getPlayerBySeat(2)!;
    const dave = room.getPlayerBySeat(3)!;

    alice.hand = [makeCard('4', 'S')];
    bob.hand = [makeCard('5', 'S')];
    charlie.hand = [makeCard('6', 'S')];
    dave.hand = [makeCard('7', 'S'), makeCard('8', 'S')];

    room.status = 'PLAYING';
    room.currentTrickPlays = [];
    room.currentTurnSeat = 0;
    room.isFirstTrickOfGame = false;
    room.activeTrickSeats = new Set([0, 1, 2, 3]);

    // 1. Alice plays her last card -> 1st Place!
    const r1 = room.playCards(alice.id, ['4_S']);
    expect(r1.success).toBe(true);
    expect(alice.finishedRank).toBe(1);
    expect(room.status).toBe('PLAYING');

    // 2. Bob beats with his last card -> 2nd Place!
    const r2 = room.playCards(bob.id, ['5_S']);
    expect(r2.success).toBe(true);
    expect(bob.finishedRank).toBe(2);
    expect(room.status).toBe('PLAYING');

    // 3. Charlie beats with his last card -> 3rd Place!
    const r3 = room.playCards(charlie.id, ['6_S']);
    expect(r3.success).toBe(true);
    expect(charlie.finishedRank).toBe(3);

    // Now 3 players finished! Dave is left with cards -> Dave is 4th Place (Loser)!
    expect(room.status).toBe('ENDED');
    expect(dave.finishedRank).toBe(4);
    expect(room.winnerPlayerId).toBe(alice.id);
  });
});
