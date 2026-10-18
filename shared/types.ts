export type Suit = 'C' | 'D' | 'H' | 'S';
// Clubs = C, Diamonds = D, Hearts = H, Spades = S

export type Rank = '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A' | '2';

export interface Card {
  id: string; // e.g. "3_S", "10_H", "A_C"
  suit: Suit;
  rank: Rank;
}

export type ComboType =
  | 'SINGLE'
  | 'PAIR'
  | 'THREE_OF_A_KIND'
  | 'DOUBLE_PAIR'
  | 'FULL_HOUSE' // Polo
  | 'POLO_SERI'
  | 'THREE_CARD_STRAIGHT_FLUSH'
  | 'BOMB_FOUR_OF_A_KIND'
  | 'BOMB_STRAIGHT_FLUSH';

export interface CardCombination {
  type: ComboType;
  cardCount: number;
  cards: Card[];
  // Values used for strict comparison
  primaryRankValue: number;    // Main rank value (e.g. single rank, triple rank, high card of straight flush)
  secondaryRankValue?: number;  // Secondary rank value (e.g. pair rank in Full House or Polo Seri)
  suitValue: number;           // Suit value of key card for tie-breaking
  displayName: string;
}

export type PlayerSeat = 0 | 1 | 2 | 3;

export interface PlayerPublic {
  id: string;
  seat: PlayerSeat;
  displayName: string;
  isReady: boolean;
  cardCount: number;
  passedInCurrentTrick: boolean;
  isConnected: boolean;
  isHost: boolean;
  isBot?: boolean;
  finishedRank?: number; // 1 = 1st (winner), 2 = 2nd, etc.
}

export interface PlayedTrick {
  playerId: string;
  playerName: string;
  seat: PlayerSeat;
  combination: CardCombination;
  timestamp: number;
  isBombCounter?: boolean;
}

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'ENDED';

export interface GameSettings {
  turnTimeLimitSeconds: number; // 0 for unlimited, or e.g. 30
  suitRankingOrder: Suit[];     // default ['C', 'D', 'H', 'S']
  bombStraightFlushBeatsFourOfAKind: boolean;
}

export interface BombEventNotification {
  bomberName: string;
  bombedPlayerName: string;
  bombType: 'BOMB_FOUR_OF_A_KIND' | 'BOMB_STRAIGHT_FLUSH';
  cards: Card[];
  message: string;
}

export interface GameLogEntry {
  id: string;
  text: string;
  type: 'info' | 'play' | 'pass' | 'bomb' | 'win' | 'chat';
  timestamp: number;
}

export interface OpeningThreeCard {
  card: Card;
  playerName: string;
  isWinner: boolean;
}

export interface GameStatePublic {
  roomId: string;
  status: RoomStatus;
  players: PlayerPublic[];
  currentTurnSeat: PlayerSeat | null;
  currentTurnPlayerId: string | null;
  currentTrickPlays: PlayedTrick[];
  latestPlay: PlayedTrick | null;
  trickLeadPlayerId: string | null;
  roundNumber: number;
  isFirstTrickOfGame: boolean;
  winnerPlayerId: string | null;
  lastEventMessage: string | null;
  bombAlert: BombEventNotification | null;
  openingThreesShowcase: OpeningThreeCard[] | null;
  settings: GameSettings;
  logs: GameLogEntry[];
}

export interface PlayerPrivateState {
  hand: Card[];
}

export interface ClientGameState {
  publicState: GameStatePublic;
  myHand: Card[];
  myPlayerId: string;
  mySeat: PlayerSeat | null;
}

// Client -> Server Events
export interface ClientToServerEvents {
  'room:create': (data: { displayName: string }, callback: (res: { success: boolean; roomId?: string; playerId?: string; error?: string }) => void) => void;
  'room:join': (data: { roomId: string; displayName: string; preferredSeat?: PlayerSeat; sessionToken?: string }, callback: (res: { success: boolean; playerId?: string; sessionToken?: string; error?: string }) => void) => void;
  'room:leave': () => void;
  'room:add_bot': (data: { seat?: PlayerSeat }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'room:remove_bot': (data: { seat: PlayerSeat }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'player:ready': (data: { isReady: boolean }) => void;
  'player:switch_seat': (data: { targetSeat: PlayerSeat }) => void;
  'game:start': () => void;
  'game:play_cards': (data: { cardIds: string[] }, callback: (res: { success: boolean; error?: string }) => void) => void;
  'game:pass': (callback: (res: { success: boolean; error?: string }) => void) => void;
  'game:restart': () => void;
  'chat:send': (data: { message: string }) => void;
}

// Server -> Client Events
export interface ServerToClientEvents {
  'game:state_update': (state: GameStatePublic) => void;
  'player:private_hand': (privateState: PlayerPrivateState) => void;
  'game:log': (entry: GameLogEntry) => void;
  'game:bomb_exploded': (notification: BombEventNotification) => void;
  'game:ended': (data: { winnerId: string; winnerName: string; standings: { playerId: string; displayName: string; cardsLeft: number; rank: number }[] }) => void;
  'error:notification': (data: { message: string }) => void;
}
