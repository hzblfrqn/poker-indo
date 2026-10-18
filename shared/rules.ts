import type { GameSettings, PlayerPublic, PlayerSeat } from './types.js';

export const DEFAULT_GAME_SETTINGS: GameSettings = {
  turnTimeLimitSeconds: 0, // 0 = no time limit
  suitRankingOrder: ['D', 'C', 'H', 'S'],
  bombStraightFlushBeatsFourOfAKind: true,
};

export function getNextClockwiseSeat(currentSeat: PlayerSeat): PlayerSeat {
  return ((currentSeat + 1) % 4) as PlayerSeat;
}

export function getNextActiveSeat(
  currentSeat: PlayerSeat,
  eligibleSeats: Set<PlayerSeat>
): PlayerSeat | null {
  if (eligibleSeats.size === 0) return null;

  let checkSeat = getNextClockwiseSeat(currentSeat);
  for (let i = 0; i < 4; i++) {
    if (eligibleSeats.has(checkSeat)) {
      return checkSeat;
    }
    checkSeat = getNextClockwiseSeat(checkSeat);
  }
  return null;
}
