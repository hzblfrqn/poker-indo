import { v4 as uuidv4 } from 'uuid';
import {
  BombEventNotification,
  Card,
  CardCombination,
  ClientToServerEvents,
  GameLogEntry,
  GameStatePublic,
  GameSettings,
  OpeningThreeCard,
  PlayedTrick,
  PlayerPrivateState,
  PlayerPublic,
  PlayerSeat,
  RoomStatus,
  ServerToClientEvents,
} from '../../shared/types.js';
import {
  STARTING_CARD_ID,
  RANK_VALUES,
  DEFAULT_SUIT_VALUES,
  SUIT_SYMBOLS,
} from '../../shared/constants.js';
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
import {
  DEFAULT_GAME_SETTINGS,
  getNextActiveSeat,
  getNextClockwiseSeat,
} from '../../shared/rules.js';
import { chooseBotPlay, BOT_NAMES } from './botAI.js';

interface InternalPlayer {
  id: string;
  socketId: string;
  sessionToken: string;
  displayName: string;
  seat: PlayerSeat;
  isReady: boolean;
  isConnected: boolean;
  isHost: boolean;
  isBot?: boolean;
  hand: Card[];
  finishedRank?: number;
}

export class Room {
  public readonly id: string;
  public status: RoomStatus = 'LOBBY';
  public settings: GameSettings = { ...DEFAULT_GAME_SETTINGS };

  private players: Map<string, InternalPlayer> = new Map(); // id -> InternalPlayer
  private sessionToPlayerId: Map<string, string> = new Map(); // sessionToken -> playerId
  private socketToPlayerId: Map<string, string> = new Map(); // socketId -> playerId

  public currentTurnSeat: PlayerSeat | null = null;
  public trickLeadPlayerId: string | null = null;
  public activeTrickSeats: Set<PlayerSeat> = new Set();
  public currentTrickPlays: PlayedTrick[] = [];
  public roundNumber = 1;
  public isFirstTrickOfGame = true;
  public winnerPlayerId: string | null = null;
  public finishedRankCounter = 0;
  public lastEventMessage: string | null = null;
  public bombAlert: BombEventNotification | null = null;
  public openingThreesShowcase: OpeningThreeCard[] | null = null;
  public gamesPlayedCount = 0;
  public previousWinnerPlayerId: string | null = null;
  public logs: GameLogEntry[] = [];

  constructor(id: string) {
    this.id = id;
    this.addLog('Room created. Waiting for 4 players...', 'info');
  }

  public getPlayerBySocketId(socketId: string): InternalPlayer | undefined {
    const playerId = this.socketToPlayerId.get(socketId);
    return playerId ? this.players.get(playerId) : undefined;
  }

  public getPlayerBySession(sessionToken: string): InternalPlayer | undefined {
    const playerId = this.sessionToPlayerId.get(sessionToken);
    return playerId ? this.players.get(playerId) : undefined;
  }

  public getPlayerCount(): number {
    return this.players.size;
  }

  public addLog(text: string, type: GameLogEntry['type'] = 'info'): void {
    const entry: GameLogEntry = {
      id: uuidv4(),
      text,
      type,
      timestamp: Date.now(),
    };
    this.logs.push(entry);
    if (this.logs.length > 50) {
      this.logs.shift();
    }
  }

  public joinPlayer(
    socketId: string,
    displayName: string,
    preferredSeat?: PlayerSeat,
    existingSessionToken?: string
  ): { player: InternalPlayer; isReconnect: boolean } {
    // Check if reconnecting by existing session token
    if (existingSessionToken && this.sessionToPlayerId.has(existingSessionToken)) {
      const existingPlayerId = this.sessionToPlayerId.get(existingSessionToken)!;
      const existingPlayer = this.players.get(existingPlayerId);
      if (existingPlayer) {
        // Disassociate old socketId
        this.socketToPlayerId.delete(existingPlayer.socketId);
        // Reassociate
        existingPlayer.socketId = socketId;
        existingPlayer.isConnected = true;
        this.socketToPlayerId.set(socketId, existingPlayer.id);
        this.addLog(`${existingPlayer.displayName} reconnected to the game.`, 'info');
        return { player: existingPlayer, isReconnect: true };
      }
    }

    if (this.players.size >= 4) {
      throw new Error('Room is full (maximum 4 players)');
    }

    // Find taken seats
    const takenSeats = new Set<PlayerSeat>();
    for (const p of this.players.values()) {
      takenSeats.add(p.seat);
    }

    let assignedSeat: PlayerSeat;
    if (preferredSeat !== undefined && !takenSeats.has(preferredSeat) && preferredSeat >= 0 && preferredSeat <= 3) {
      assignedSeat = preferredSeat;
    } else {
      const availableSeats: PlayerSeat[] = ([0, 1, 2, 3] as PlayerSeat[]).filter(
        (s) => !takenSeats.has(s)
      );
      if (availableSeats.length === 0) {
        throw new Error('No available seats');
      }
      assignedSeat = availableSeats[0];
    }

    const playerId = uuidv4();
    const sessionToken = uuidv4();
    const isHost = this.players.size === 0;

    const newPlayer: InternalPlayer = {
      id: playerId,
      socketId,
      sessionToken,
      displayName: displayName.trim() || `Player ${assignedSeat + 1}`,
      seat: assignedSeat,
      isReady: false,
      isConnected: true,
      isHost,
      hand: [],
    };

    this.players.set(playerId, newPlayer);
    this.sessionToPlayerId.set(sessionToken, playerId);
    this.socketToPlayerId.set(socketId, playerId);

    this.addLog(`${newPlayer.displayName} took Seat ${assignedSeat + 1}.`, 'info');

    return { player: newPlayer, isReconnect: false };
  }

  public addBot(preferredSeat?: PlayerSeat): { success: boolean; error?: string } {
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'Cannot add bots once game has started' };
    }
    if (this.players.size >= 4) {
      return { success: false, error: 'Room is already full' };
    }

    const takenSeats = new Set<PlayerSeat>();
    for (const p of this.players.values()) {
      takenSeats.add(p.seat);
    }

    let assignedSeat: PlayerSeat;
    if (preferredSeat !== undefined && !takenSeats.has(preferredSeat) && preferredSeat >= 0 && preferredSeat <= 3) {
      assignedSeat = preferredSeat;
    } else {
      const availableSeats = ([0, 1, 2, 3] as PlayerSeat[]).filter((s) => !takenSeats.has(s));
      if (availableSeats.length === 0) {
        return { success: false, error: 'No empty seat' };
      }
      assignedSeat = availableSeats[0];
    }

    const botId = `bot_${uuidv4().slice(0, 8)}`;
    const usedNames = new Set(Array.from(this.players.values()).map((p) => p.displayName));
    const candidateName = BOT_NAMES.find((n) => !usedNames.has(`Bot ${n}`)) || `Bot ${assignedSeat + 1}`;
    const displayName = `Bot ${candidateName}`;

    const botPlayer: InternalPlayer = {
      id: botId,
      socketId: `socket_${botId}`,
      sessionToken: `token_${botId}`,
      displayName,
      seat: assignedSeat,
      isReady: true, // Bots are ready immediately
      isConnected: true,
      isHost: false,
      isBot: true,
      hand: [],
    };

    this.players.set(botId, botPlayer);
    this.sessionToPlayerId.set(botPlayer.sessionToken, botId);
    this.addLog(`${displayName} (AI) joined Seat ${assignedSeat + 1}.`, 'info');

    return { success: true };
  }

  public removeBot(seat: PlayerSeat): { success: boolean; error?: string } {
    if (this.status !== 'LOBBY') {
      return { success: false, error: 'Cannot remove bots once game has started' };
    }

    const botPlayer = this.getPlayerBySeat(seat);
    if (!botPlayer || !botPlayer.isBot) {
      return { success: false, error: 'No bot found at that seat' };
    }

    this.players.delete(botPlayer.id);
    this.sessionToPlayerId.delete(botPlayer.sessionToken);
    this.socketToPlayerId.delete(botPlayer.socketId);
    this.addLog(`${botPlayer.displayName} was removed from Seat ${seat + 1}.`, 'info');

    return { success: true };
  }

  public leavePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const wasHost = player.isHost;
    this.players.delete(playerId);
    this.sessionToPlayerId.delete(player.sessionToken);
    this.socketToPlayerId.delete(player.socketId);

    this.addLog(`${player.displayName} left the room.`, 'info');

    // If host left, elect another human player (or bot) as host
    if (wasHost && this.players.size > 0) {
      const remaining = Array.from(this.players.values());
      const nextHuman = remaining.find((p) => !p.isBot) || remaining[0];
      nextHuman.isHost = true;
      this.addLog(`${nextHuman.displayName} is now the room host.`, 'info');
    }
  }

  public handleDisconnect(socketId: string): InternalPlayer | undefined {
    const player = this.getPlayerBySocketId(socketId);
    if (!player) return undefined;

    player.isConnected = false;
    this.addLog(`${player.displayName} temporarily disconnected.`, 'info');
    return player;
  }

  public switchSeat(playerId: string, targetSeat: PlayerSeat): void {
    if (this.status !== 'LOBBY') {
      throw new Error('Cannot switch seats once the game has started');
    }
    const player = this.players.get(playerId);
    if (!player) throw new Error('Player not found');

    if (player.seat === targetSeat) return;

    for (const p of this.players.values()) {
      if (p.seat === targetSeat) {
        throw new Error(`Seat ${targetSeat + 1} is already occupied`);
      }
    }

    player.seat = targetSeat;
    player.isReady = false; // unready on seat switch
    this.addLog(`${player.displayName} moved to Seat ${targetSeat + 1}.`, 'info');
  }

  public setReady(playerId: string, isReady: boolean): void {
    if (this.status !== 'LOBBY') return;
    const player = this.players.get(playerId);
    if (!player) return;

    player.isReady = isReady;
    this.addLog(`${player.displayName} is ${isReady ? 'READY' : 'NOT READY'}.`, 'info');
  }

  public canStartGame(): boolean {
    if (this.players.size !== 4) return false;
    for (const p of this.players.values()) {
      if (!p.isReady) return false;
    }
    return true;
  }

  public startGame(): void {
    if (!this.canStartGame()) {
      throw new Error('All 4 players must be seated and ready to start');
    }

    this.status = 'PLAYING';
    this.winnerPlayerId = null;
    this.finishedRankCounter = 0;
    this.bombAlert = null;
    this.currentTrickPlays = [];
    this.isFirstTrickOfGame = true;

    // Reset player hands & finished status
    for (const p of this.players.values()) {
      p.hand = [];
      p.finishedRank = undefined;
    }

    // Generate, shuffle, and deal deck
    const deck = shuffleDeck(createStandardDeck());
    const hands = dealHands(deck);

    // Assign hands to seats 0, 1, 2, 3
    const playersBySeat = new Map<PlayerSeat, InternalPlayer>();
    for (const p of this.players.values()) {
      playersBySeat.set(p.seat, p);
    }

    for (let seat = 0; seat < 4; seat++) {
      const player = playersBySeat.get(seat as PlayerSeat);
      if (player) {
        player.hand = sortHand(hands[seat]);
      }
    }

    const isFirstGameInRoom = this.gamesPlayedCount === 0;

    if (isFirstGameInRoom) {
      // Automatic Opening Phase (ONLY on the very first game of the room):
      // Every player places their 3(s) on the table.
      // The player holding the 3 of Spades (3♠) wins the opening phase and leads trick 1.
      const openingThrees: OpeningThreeCard[] = [];
      let startingSeat: PlayerSeat = 0;

      for (let seat = 0; seat < 4; seat++) {
        const player = playersBySeat.get(seat as PlayerSeat);
        if (player) {
          const threes = player.hand.filter((c) => c.rank === '3');
          for (const t of threes) {
            const isWinner = t.id === STARTING_CARD_ID;
            openingThrees.push({
              card: t,
              playerName: player.displayName,
              isWinner,
            });
            if (isWinner) {
              startingSeat = player.seat;
            }
          }
          // Remove 3s from the player's hand as they were placed on the table
          player.hand = player.hand.filter((c) => c.rank !== '3');
        }
      }

      // Sort opening threes by suit for clean display (Diamond < Club < Heart < Spade)
      openingThrees.sort(
        (a, b) => DEFAULT_SUIT_VALUES[a.card.suit] - DEFAULT_SUIT_VALUES[b.card.suit]
      );
      this.openingThreesShowcase = openingThrees;

      const startingPlayer = playersBySeat.get(startingSeat);
      this.currentTurnSeat = startingSeat;
      this.trickLeadPlayerId = startingPlayer?.id ?? null;
      this.activeTrickSeats = new Set<PlayerSeat>([0, 1, 2, 3]);
      this.isFirstTrickOfGame = false; // Opening 3s rule completed!

      const threesList = openingThrees
        .map(
          (t) =>
            `${t.card.rank}${SUIT_SYMBOLS[t.card.suit]}${
              t.card.id === STARTING_CARD_ID ? ' (Highest)' : ''
            } (${t.playerName})`
        )
        .join(', ');

      this.addLog(
        `🎲 Opening Phase (Game 1): All 3s placed on the table [${threesList}]. ${startingPlayer?.displayName} holds the highest 3 (3♠) and takes the lead to play any combination!`,
        'info'
      );
    } else {
      // Subsequent / Rematch Game:
      // Threes rule is NOT applied!
      // Players keep all their cards in hand (full 13-card hands).
      // Winner of the previous game goes first with any combination!
      this.openingThreesShowcase = null;

      let startingPlayer = this.previousWinnerPlayerId
        ? this.players.get(this.previousWinnerPlayerId)
        : undefined;

      if (!startingPlayer) {
        startingPlayer = playersBySeat.get(0) || Array.from(this.players.values())[0];
      }

      const startingSeat = startingPlayer.seat;
      this.currentTurnSeat = startingSeat;
      this.trickLeadPlayerId = startingPlayer.id;
      this.activeTrickSeats = new Set<PlayerSeat>([0, 1, 2, 3]);
      this.isFirstTrickOfGame = false;

      this.addLog(
        `👑 Game #${this.gamesPlayedCount + 1}: ${startingPlayer.displayName} won the previous game and goes first to lead any combination!`,
        'info'
      );
    }
  }

  public playCards(playerId: string, cardIds: string[]): { success: boolean; error?: string } {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'Game is not in playing state' };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found in room' };
    }

    if (this.currentTurnSeat !== player.seat) {
      return { success: false, error: 'Not your turn' };
    }

    if (!cardIds || cardIds.length === 0) {
      return { success: false, error: 'No cards selected' };
    }

    // Verify player actually possesses these cards in their server hand
    const playerHandMap = new Map<string, Card>();
    for (const card of player.hand) {
      playerHandMap.set(card.id, card);
    }

    const cardsToPlay: Card[] = [];
    for (const cid of cardIds) {
      const card = playerHandMap.get(cid);
      if (!card) {
        return { success: false, error: `Card ${cid} not in your hand` };
      }
      cardsToPlay.push(card);
    }

    // Detect combination
    const combination = detectCombination(cardsToPlay);
    if (!combination) {
      return { success: false, error: 'Selected cards do not form a valid combination' };
    }

    const latestPlay = this.getLatestPlay();

    // If leading the trick (no current play on table)
    if (!latestPlay) {
      const leadCheck = isValidLeadPlay(combination, this.isFirstTrickOfGame);
      if (!leadCheck.valid) {
        return { success: false, error: leadCheck.reason || 'Invalid lead play' };
      }
    } else {
      // Must beat the latest play
      const beatCheck = canBeat(latestPlay.combination, combination, this.settings);
      if (!beatCheck.valid) {
        return { success: false, error: beatCheck.reason || 'Cannot beat the current play' };
      }
    }

    // Check if this play is a bomb countering a Single 2
    const isBombingSingleTwo = latestPlay && isSingleTwo(latestPlay.combination) && isBomb(combination);

    // Play is legal! Remove cards from player's hand
    player.hand = player.hand.filter((c) => !cardIds.includes(c.id));

    // Record the played trick
    const playedTrick: PlayedTrick = {
      playerId: player.id,
      playerName: player.displayName,
      seat: player.seat,
      combination,
      timestamp: Date.now(),
      isBombCounter: Boolean(isBombingSingleTwo),
    };
    this.currentTrickPlays.push(playedTrick);
    this.trickLeadPlayerId = player.id;
    this.isFirstTrickOfGame = false;
    this.openingThreesShowcase = null;

    this.addLog(
      `${player.displayName} played ${combination.displayName} (${player.hand.length} cards remaining)`,
      'play'
    );

    // Check if player has emptied their hand
    const playerEmptiedHand = player.hand.length === 0 && !player.finishedRank;
    if (playerEmptiedHand) {
      this.finishedRankCounter++;
      player.finishedRank = this.finishedRankCounter;

      const rankTitle =
        this.finishedRankCounter === 1
          ? '🥇 1st Place (Winner)'
          : this.finishedRankCounter === 2
          ? '🥈 2nd Place'
          : '🥉 3rd Place';

      this.addLog(
        `🎉 ${player.displayName} emptied their hand and claimed ${rankTitle}!`,
        'win'
      );

      // Check how many players still have cards
      const remainingWithCards = Array.from(this.players.values()).filter(
        (p) => p.hand.length > 0
      );

      // If only 1 player remains with cards (meaning 3 players finished), that last player is 4th Place (Loser)!
      if (remainingWithCards.length <= 1) {
        if (remainingWithCards.length === 1) {
          const loser = remainingWithCards[0];
          this.finishedRankCounter++;
          loser.finishedRank = 4;
          this.addLog(
            `💥 Game over! ${loser.displayName} is left with ${loser.hand.length} card(s) and takes 4th Place (Loser)!`,
            'info'
          );
        }
        this.finishGame();
        return { success: true };
      }

      this.addLog(
        `⚔️ The game continues for the remaining ${remainingWithCards.length} players!`,
        'info'
      );
    }

    // Case A: Bomb Countered a Single 2!
    if (isBombingSingleTwo) {
      const bombedPlayerName = latestPlay.playerName;
      const bombedPlayer =
        this.players.get(latestPlay.playerId) || this.getPlayerBySeat(latestPlay.seat);

      this.bombAlert = {
        bomberName: player.displayName,
        bombedPlayerName,
        bombType: combination.type as 'BOMB_FOUR_OF_A_KIND' | 'BOMB_STRAIGHT_FLUSH',
        cards: combination.cards,
        message: `💥💣 INSTANT KNOCKOUT! ${player.displayName} BOMBED ${bombedPlayerName}'s Single 2! Game Over!`,
      };

      this.addLog(this.bombAlert.message, 'bomb');
      this.addLog(
        `💀 ${bombedPlayerName} played a Single 2 and got BOMBED! ${bombedPlayerName} immediately loses (4th Place)! ${player.displayName} wins (1st Place)!`,
        'win'
      );

      // Bomber takes 1st Place
      player.finishedRank = 1;
      this.winnerPlayerId = player.id;

      // Bombed player takes 4th Place (Loser)
      if (bombedPlayer) {
        bombedPlayer.finishedRank = 4;
      }

      // Other 2 players get 2nd and 3rd place by fewest cards remaining
      const otherPlayers = Array.from(this.players.values()).filter(
        (p) => p.id !== player.id && (!bombedPlayer || p.id !== bombedPlayer.id)
      );
      otherPlayers.sort((a, b) => a.hand.length - b.hand.length);
      if (otherPlayers[0]) otherPlayers[0].finishedRank = 2;
      if (otherPlayers[1]) otherPlayers[1].finishedRank = 3;

      this.finishGame();
      return { success: true };
    }

    // If player has emptied their hand, remove from active trick seats
    if (player.hand.length === 0) {
      this.activeTrickSeats.delete(player.seat);
    }

    // Advance turn to next active trick player
    const nextSeat = getNextActiveSeat(player.seat, this.activeTrickSeats);
    if (nextSeat === null || nextSeat === player.seat) {
      this.resolveTrickEnd(player.seat, `${player.displayName} won the trick!`);
    } else {
      this.currentTurnSeat = nextSeat;
    }

    return { success: true };
  }

  public pass(playerId: string): { success: boolean; error?: string } {
    if (this.status !== 'PLAYING') {
      return { success: false, error: 'Game is not playing' };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found' };
    }

    if (this.currentTurnSeat !== player.seat) {
      return { success: false, error: 'Not your turn' };
    }

    const latestPlay = this.getLatestPlay();
    if (!latestPlay) {
      return { success: false, error: 'You are leading the trick and cannot pass' };
    }

    this.activeTrickSeats.delete(player.seat);
    this.addLog(`${player.displayName} passed.`, 'pass');

    // Remaining challengers: any active player in the trick other than the one who made the standing play
    const remainingChallengers = Array.from(this.activeTrickSeats).filter(
      (seat) => seat !== latestPlay.seat
    );

    // If nobody else is fighting the card (all other active players passed), the play stands!
    if (remainingChallengers.length === 0) {
      const winnerSeat = latestPlay.seat;
      const winnerPlayer = this.getPlayerBySeat(winnerSeat);
      const winnerName = winnerPlayer?.displayName || 'Player';

      this.resolveTrickEnd(winnerSeat, `${winnerName}'s play stood (all other players passed)!`);
    } else {
      const nextSeat = getNextActiveSeat(player.seat, this.activeTrickSeats);
      if (nextSeat !== null) {
        this.currentTurnSeat = nextSeat;
      } else {
        const winnerSeat = latestPlay.seat;
        this.resolveTrickEnd(winnerSeat, `${latestPlay.playerName}'s play stood!`);
      }
    }

    return { success: true };
  }

  public triggerBotTurn(onAction: () => void): void {
    if (this.status !== 'PLAYING' || this.currentTurnSeat === null) return;

    const currentPlayer = this.getPlayerBySeat(this.currentTurnSeat);
    if (!currentPlayer || !currentPlayer.isBot) return;

    // Small delay (900ms) for realistic bot action
    setTimeout(() => {
      if (this.status !== 'PLAYING' || this.currentTurnSeat !== currentPlayer.seat) return;

      const cardsToPlay = chooseBotPlay(
        currentPlayer.hand,
        this.getLatestPlay(),
        this.isFirstTrickOfGame,
        this.settings
      );

      if (cardsToPlay && cardsToPlay.length > 0) {
        this.playCards(currentPlayer.id, cardsToPlay);
      } else {
        this.pass(currentPlayer.id);
      }

      onAction();

      // If next turn is also a bot, trigger their turn
      if (this.status === 'PLAYING' && this.currentTurnSeat !== null) {
        const nextP = this.getPlayerBySeat(this.currentTurnSeat);
        if (nextP && nextP.isBot) {
          this.triggerBotTurn(onAction);
        }
      }
    }, 900);
  }

  private resolveTrickEnd(winnerSeat: PlayerSeat, logMsg: string): void {
    this.addLog(logMsg, 'info');

    this.currentTrickPlays = [];

    // All players who still have cards
    const activeSeats = new Set<PlayerSeat>();
    for (const p of this.players.values()) {
      if (p.hand.length > 0) {
        activeSeats.add(p.seat);
      }
    }

    if (activeSeats.size <= 1) {
      // 1 or 0 players left with cards -> Game ends!
      const remaining = Array.from(this.players.values()).filter((p) => p.hand.length > 0);
      if (remaining.length === 1 && !remaining[0].finishedRank) {
        this.finishedRankCounter++;
        remaining[0].finishedRank = 4;
        this.addLog(
          `💥 Game over! ${remaining[0].displayName} is left with ${remaining[0].hand.length} card(s) and takes 4th Place (Loser)!`,
          'info'
        );
      }
      this.finishGame();
      return;
    }

    // Determine who leads next:
    // If winner still has cards, they lead.
    // If winner finished their hand (e.g. 1st or 2nd place), lead passes clockwise to the next active player with cards!
    let nextLeadSeat = winnerSeat;
    const winnerPlayer = this.getPlayerBySeat(winnerSeat);
    if (!winnerPlayer || winnerPlayer.hand.length === 0) {
      const nextActiveLead = getNextActiveSeat(winnerSeat, activeSeats);
      if (nextActiveLead !== null) {
        nextLeadSeat = nextActiveLead;
      } else {
        nextLeadSeat = Array.from(activeSeats)[0];
      }
      const nextLeadPlayer = this.getPlayerBySeat(nextLeadSeat);
      this.addLog(
        `➡️ ${winnerPlayer?.displayName || 'Winner'} has emptied their hand! The turn goes to ${nextLeadPlayer?.displayName || 'next player'} to lead the next trick.`,
        'info'
      );
    }

    this.currentTurnSeat = nextLeadSeat;
    const nextLeadPlayer = this.getPlayerBySeat(nextLeadSeat);
    this.trickLeadPlayerId = nextLeadPlayer?.id ?? null;
    this.activeTrickSeats = activeSeats;
  }

  private finishGame(): void {
    this.status = 'ENDED';
    const firstPlace = Array.from(this.players.values()).find((p) => p.finishedRank === 1);
    this.winnerPlayerId = firstPlace?.id ?? null;

    // Track game count and previous winner for next rematch
    this.gamesPlayedCount++;
    this.previousWinnerPlayerId = this.winnerPlayerId;

    // Any remaining player without a rank gets assigned rank
    const unranked = Array.from(this.players.values()).filter((p) => !p.finishedRank);
    unranked.sort((a, b) => a.hand.length - b.hand.length);
    let nextRank = this.finishedRankCounter + 1;
    for (const p of unranked) {
      p.finishedRank = nextRank++;
    }

    this.addLog(
      `🏆 GAME OVER! 1st: ${firstPlace?.displayName || 'Winner'}!`,
      'win'
    );
  }

  public restartGame(): void {
    if (this.status !== 'ENDED') return;

    this.status = 'LOBBY';
    this.winnerPlayerId = null;
    this.finishedRankCounter = 0;
    this.bombAlert = null;
    this.openingThreesShowcase = null;
    this.currentTrickPlays = [];
    this.logs = [];

    for (const p of this.players.values()) {
      p.isReady = Boolean(p.isBot); // bots stay ready
      p.hand = [];
      p.finishedRank = undefined;
    }

    const prevWinner = this.previousWinnerPlayerId ? this.players.get(this.previousWinnerPlayerId) : undefined;
    this.addLog(
      `Game reset for rematch (Game #${this.gamesPlayedCount + 1}). ${prevWinner?.displayName || 'Winner'} will go first! Players ready up to begin!`,
      'info'
    );
  }

  public getPlayerBySeat(seat: PlayerSeat): InternalPlayer | undefined {
    for (const p of this.players.values()) {
      if (p.seat === seat) return p;
    }
    return undefined;
  }

  public getLatestPlay(): PlayedTrick | null {
    if (this.currentTrickPlays.length === 0) return null;
    return this.currentTrickPlays[this.currentTrickPlays.length - 1];
  }

  public getPublicState(): GameStatePublic {
    const playersPublic: PlayerPublic[] = Array.from(this.players.values())
      .map((p) => ({
        id: p.id,
        seat: p.seat,
        displayName: p.displayName,
        isReady: p.isReady,
        cardCount: p.hand.length,
        passedInCurrentTrick: !this.activeTrickSeats.has(p.seat) && this.status === 'PLAYING' && p.hand.length > 0,
        isConnected: p.isConnected,
        isHost: p.isHost,
        isBot: p.isBot,
        finishedRank: p.finishedRank,
      }))
      .sort((a, b) => a.seat - b.seat);

    return {
      roomId: this.id,
      status: this.status,
      players: playersPublic,
      currentTurnSeat: this.currentTurnSeat,
      currentTurnPlayerId: this.currentTurnSeat !== null
        ? this.getPlayerBySeat(this.currentTurnSeat)?.id ?? null
        : null,
      currentTrickPlays: this.currentTrickPlays,
      latestPlay: this.getLatestPlay(),
      trickLeadPlayerId: this.trickLeadPlayerId,
      roundNumber: this.roundNumber,
      isFirstTrickOfGame: this.isFirstTrickOfGame,
      winnerPlayerId: this.winnerPlayerId,
      lastEventMessage: this.lastEventMessage,
      bombAlert: this.bombAlert,
      openingThreesShowcase: this.openingThreesShowcase,
      settings: this.settings,
      logs: this.logs,
    };
  }

  public getPlayerPrivateState(playerId: string): PlayerPrivateState {
    const player = this.players.get(playerId);
    return {
      hand: player ? [...player.hand] : [],
    };
  }
}
