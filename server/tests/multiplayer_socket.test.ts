import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import cors from 'cors';
import { RoomManager } from '../src/RoomManager.js';
import { ClientToServerEvents, ServerToClientEvents, GameStatePublic, PlayerPrivateState } from '../../shared/types.js';

describe('End-to-End 4-Player Socket Multiplayer Test', () => {
  let httpServer: any;
  let ioServer: Server;
  let serverPort: number;
  let roomManager: RoomManager;
  let clients: ClientSocket<ServerToClientEvents, ClientToServerEvents>[] = [];

  beforeAll(async () => {
    const app = express();
    app.use(cors());
    httpServer = createServer(app);
    ioServer = new Server(httpServer, { cors: { origin: '*' } });
    roomManager = new RoomManager();

    function syncRoomState(room: any) {
      const pub = room.getPublicState();
      ioServer.to(room.id).emit('game:state_update', pub);
      for (const p of pub.players) {
        const intP = room.getPlayerBySeat(p.seat);
        if (intP && intP.isConnected) {
          ioServer.to(intP.socketId).emit('player:private_hand', room.getPlayerPrivateState(intP.id));
        }
      }
    }

    ioServer.on('connection', (socket: any) => {
      socket.on('room:create', ({ displayName }: any, cb: any) => {
        const room = roomManager.createRoom();
        const { player } = room.joinPlayer(socket.id, displayName, 0);
        socket.join(room.id);
        cb({ success: true, roomId: room.id, playerId: player.id });
        syncRoomState(room);
      });

      socket.on('room:join', ({ roomId, displayName, preferredSeat }: any, cb: any) => {
        const room = roomManager.getRoom(roomId);
        if (!room) return cb({ success: false, error: 'Room not found' });
        const { player } = room.joinPlayer(socket.id, displayName, preferredSeat);
        socket.join(room.id);
        cb({ success: true, playerId: player.id, sessionToken: player.sessionToken });
        syncRoomState(room);
      });

      socket.on('player:ready', ({ isReady }: any) => {
        const room = roomManager.findRoomBySocketId(socket.id);
        if (!room) return;
        const player = room.getPlayerBySocketId(socket.id);
        if (!player) return;
        room.setReady(player.id, isReady);
        syncRoomState(room);
      });

      socket.on('game:start', () => {
        const room = roomManager.findRoomBySocketId(socket.id);
        if (!room) return;
        room.startGame();
        syncRoomState(room);
      });

      socket.on('game:play_cards', ({ cardIds }: any, cb: any) => {
        const room = roomManager.findRoomBySocketId(socket.id);
        if (!room) return cb({ success: false, error: 'No room' });
        const player = room.getPlayerBySocketId(socket.id);
        if (!player) return cb({ success: false, error: 'No player' });
        const res = room.playCards(player.id, cardIds);
        cb(res);
        if (res.success) syncRoomState(room);
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    clients.forEach((c) => c.disconnect());
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  });

  it('runs complete 4-player room join, ready up, deal, and private hand distribution', async () => {
    const playerNames = ['Alice', 'Bob', 'Charlie', 'Diana'];
    let roomId = '';
    const playerIds: string[] = [];
    const clientHands: Card[][] = [[], [], [], []];
    let latestPublicState: GameStatePublic | null = null;

    // Connect 4 clients
    for (let i = 0; i < 4; i++) {
      const client = ClientIO(`http://localhost:${serverPort}`, {
        transports: ['websocket'],
      });
      clients.push(client);

      client.on('game:state_update', (st) => {
        latestPublicState = st;
      });

      client.on('player:private_hand', (prv) => {
        clientHands[i] = prv.hand;
      });

      await new Promise<void>((res) => client.on('connect', () => res()));
    }

    // Client 0 creates room
    const createRes: any = await new Promise((res) => {
      clients[0].emit('room:create', { displayName: playerNames[0] }, res);
    });
    expect(createRes.success).toBe(true);
    roomId = createRes.roomId;
    playerIds.push(createRes.playerId);

    // Clients 1, 2, 3 join
    for (let i = 1; i < 4; i++) {
      const joinRes: any = await new Promise((res) => {
        clients[i].emit('room:join', { roomId, displayName: playerNames[i] }, res);
      });
      expect(joinRes.success).toBe(true);
      playerIds.push(joinRes.playerId);
    }

    // Wait for all to be in public state
    await new Promise((r) => setTimeout(r, 100));
    expect(latestPublicState?.players).toHaveLength(4);

    // All 4 ready up
    for (let i = 0; i < 4; i++) {
      clients[i].emit('player:ready', { isReady: true });
    }

    await new Promise((r) => setTimeout(r, 100));
    expect(latestPublicState?.players.every((p) => p.isReady)).toBe(true);

    // Host starts game
    clients[0].emit('game:start');
    await new Promise((r) => setTimeout(r, 150));

    expect(latestPublicState?.status).toBe('PLAYING');
    // Verify opening 3s were placed on the table
    expect(latestPublicState?.openingThreesShowcase).toHaveLength(4);

    // Verify 3♠ holder starts
    const winnerThree = latestPublicState?.openingThreesShowcase?.find((t) => t.card.id === '3_S');
    expect(winnerThree).toBeDefined();
    expect(winnerThree?.isWinner).toBe(true);

    const turnSeat = latestPublicState?.currentTurnSeat!;
    expect(latestPublicState?.players[turnSeat].displayName).toBe(winnerThree?.playerName);
  });
});
