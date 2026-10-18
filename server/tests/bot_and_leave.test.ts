import { describe, it, expect, beforeEach } from 'vitest';
import { Room } from '../src/Room.js';
import { chooseBotPlay } from '../src/botAI.js';
import { Card, Rank, Suit } from '../../shared/types.js';
import { DEFAULT_GAME_SETTINGS } from '../../shared/rules.js';

function makeCard(rank: Rank, suit: Suit): Card {
  return { id: `${rank}_${suit}`, rank, suit };
}

describe('Lobby Back Button & Bot Management', () => {
  let room: Room;

  beforeEach(() => {
    room = new Room('BOTLBY');
    room.joinPlayer('sock1', 'HostPlayer', 0);
  });

  it('allows adding bots into empty seats', () => {
    expect(room.getPlayerCount()).toBe(1);

    const res1 = room.addBot(1);
    expect(res1.success).toBe(true);
    expect(room.getPlayerCount()).toBe(2);

    const bot1 = room.getPlayerBySeat(1);
    expect(bot1?.isBot).toBe(true);
    expect(bot1?.isReady).toBe(true); // Bots are auto-ready

    // Add another bot without specifying seat
    const res2 = room.addBot();
    expect(res2.success).toBe(true);
    expect(room.getPlayerCount()).toBe(3);
  });

  it('allows removing a bot from a seat', () => {
    room.addBot(1);
    expect(room.getPlayerCount()).toBe(2);

    const removeRes = room.removeBot(1);
    expect(removeRes.success).toBe(true);
    expect(room.getPlayerCount()).toBe(1);
    expect(room.getPlayerBySeat(1)).toBeUndefined();
  });

  it('allows human player to leave room via back button', () => {
    const p1 = room.getPlayerBySeat(0)!;
    room.leavePlayer(p1.id);
    expect(room.getPlayerCount()).toBe(0);
  });

  it('fills remaining 3 seats with bots and successfully starts game', () => {
    room.addBot(1);
    room.addBot(2);
    room.addBot(3);
    expect(room.getPlayerCount()).toBe(4);

    const p0 = room.getPlayerBySeat(0)!;
    room.setReady(p0.id, true);

    expect(room.canStartGame()).toBe(true);
    room.startGame();
    expect(room.status).toBe('PLAYING');

    expect(room.openingThreesShowcase).toHaveLength(4);
    for (let s = 0; s < 4; s++) {
      expect(room.getPlayerBySeat(s as any)?.hand.length).toBeGreaterThan(0);
    }
  });
});

describe('Bot AI Decision Engine', () => {
  it('must choose play with 3♠ on first opening trick', () => {
    const hand: Card[] = [
      makeCard('3', 'S'),
      makeCard('5', 'C'),
      makeCard('9', 'D'),
      makeCard('K', 'H'),
    ];

    const play = chooseBotPlay(hand, null, true, DEFAULT_GAME_SETTINGS);
    expect(play).not.toBeNull();
    expect(play).toContain('3_S');
  });

  it('beats a lower single card with the lowest winning single', () => {
    const hand: Card[] = [
      makeCard('5', 'C'),
      makeCard('8', 'D'),
      makeCard('J', 'H'),
      makeCard('2', 'S'),
    ];

    const targetPlay: any = {
      playerId: 'human',
      playerName: 'Alice',
      seat: 0,
      timestamp: Date.now(),
      combination: {
        type: 'SINGLE',
        cardCount: 1,
        cards: [makeCard('7', 'S')],
        primaryRankValue: 4, // 7 is value 4
        suitValue: 3,
        displayName: 'Single 7♠',
      },
    };

    const play = chooseBotPlay(hand, targetPlay, false, DEFAULT_GAME_SETTINGS);
    expect(play).toEqual(['8_D']); // Lowest card beating 7 is 8!
  });

  it('counters a Single 2 with a Four of a Kind bomb if held', () => {
    const hand: Card[] = [
      makeCard('4', 'C'),
      makeCard('9', 'C'),
      makeCard('9', 'D'),
      makeCard('9', 'H'),
      makeCard('9', 'S'),
      makeCard('K', 'H'),
    ];

    const targetPlay: any = {
      playerId: 'human',
      playerName: 'Alice',
      seat: 0,
      timestamp: Date.now(),
      combination: {
        type: 'SINGLE',
        cardCount: 1,
        cards: [makeCard('2', 'H')],
        primaryRankValue: 12,
        suitValue: 2,
        displayName: 'Single 2♥',
      },
    };

    const play = chooseBotPlay(hand, targetPlay, false, DEFAULT_GAME_SETTINGS);
    expect(play).toEqual(['9_C', '9_D', '9_H', '9_S']);
  });
});
