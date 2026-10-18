import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { RoomManager } from './RoomManager.js';
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from '../../shared/types.js';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Broadcast helper
function syncRoomState(room: ReturnType<typeof roomManager.createRoom>) {
  const publicState = room.getPublicState();
  io.to(room.id).emit('game:state_update', publicState);

  // Send private state to each connected player individually
  for (const player of publicState.players) {
    const internalPlayer = room.getPlayerBySeat(player.seat);
    if (internalPlayer && internalPlayer.isConnected && !internalPlayer.isBot) {
      io.to(internalPlayer.socketId).emit(
        'player:private_hand',
        room.getPlayerPrivateState(internalPlayer.id)
      );
    }
  }

  // If bomb alert active, broadcast explosion
  if (publicState.bombAlert) {
    io.to(room.id).emit('game:bomb_exploded', publicState.bombAlert);
  }

  // If game ended, broadcast ended event
  if (publicState.status === 'ENDED' && publicState.winnerPlayerId) {
    const winner = publicState.players.find((p) => p.id === publicState.winnerPlayerId);
    io.to(room.id).emit('game:ended', {
      winnerId: publicState.winnerPlayerId,
      winnerName: winner?.displayName || 'Winner',
      standings: publicState.players.map((p) => ({
        playerId: p.id,
        displayName: p.displayName,
        cardsLeft: p.cardCount,
        rank: p.finishedRank || 4,
      })),
    });
  }
}

io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
  // 1. Create Room
  socket.on('room:create', ({ displayName }, callback) => {
    try {
      const room = roomManager.createRoom();
      const { player } = room.joinPlayer(socket.id, displayName, 0);
      socket.join(room.id);

      callback({
        success: true,
        roomId: room.id,
        playerId: player.id,
      });

      syncRoomState(room);
    } catch (err: any) {
      callback({ success: false, error: err.message || 'Failed to create room' });
    }
  });

  // 2. Join Room (or Reconnect)
  socket.on('room:join', ({ roomId, displayName, preferredSeat, sessionToken }, callback) => {
    try {
      const room = roomManager.getRoom(roomId);
      if (!room) {
        return callback({ success: false, error: 'Room not found' });
      }

      const { player } = room.joinPlayer(
        socket.id,
        displayName,
        preferredSeat,
        sessionToken
      );

      socket.join(room.id);

      callback({
        success: true,
        playerId: player.id,
        sessionToken: player.sessionToken,
      });

      syncRoomState(room);
    } catch (err: any) {
      callback({ success: false, error: err.message || 'Failed to join room' });
    }
  });

  // 3. Leave Room (Back Button)
  socket.on('room:leave', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    room.leavePlayer(player.id);
    socket.leave(room.id);
    syncRoomState(room);
  });

  // 4. Add Bot
  socket.on('room:add_bot', ({ seat }, callback) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }
    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) {
      return callback({ success: false, error: 'Only the host can add bots' });
    }

    const res = room.addBot(seat);
    callback(res);
    if (res.success) {
      syncRoomState(room);
    }
  });

  // 5. Remove Bot
  socket.on('room:remove_bot', ({ seat }, callback) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }
    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) {
      return callback({ success: false, error: 'Only the host can remove bots' });
    }

    const res = room.removeBot(seat);
    callback(res);
    if (res.success) {
      syncRoomState(room);
    }
  });

  // 6. Switch Seat
  socket.on('player:switch_seat', ({ targetSeat }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    try {
      room.switchSeat(player.id, targetSeat);
      syncRoomState(room);
    } catch (err: any) {
      socket.emit('error:notification', { message: err.message });
    }
  });

  // 7. Ready Status
  socket.on('player:ready', ({ isReady }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    room.setReady(player.id, isReady);
    syncRoomState(room);
  });

  // 8. Start Game
  socket.on('game:start', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayerBySocketId(socket.id);
    if (!player || !player.isHost) {
      socket.emit('error:notification', { message: 'Only the host can start the game' });
      return;
    }

    try {
      room.startGame();
      syncRoomState(room);
      // Trigger bot turn if starting player is a bot
      room.triggerBotTurn(() => syncRoomState(room));
    } catch (err: any) {
      socket.emit('error:notification', { message: err.message });
    }
  });

  // 9. Play Cards
  socket.on('game:play_cards', ({ cardIds }, callback) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      return callback({ success: false, error: 'Player not recognized' });
    }

    const result = room.playCards(player.id, cardIds);
    callback(result);

    if (result.success) {
      syncRoomState(room);
      // Trigger bot turn if next turn is a bot
      room.triggerBotTurn(() => syncRoomState(room));
    }
  });

  // 10. Pass
  socket.on('game:pass', (callback) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) {
      return callback({ success: false, error: 'Room not found' });
    }
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) {
      return callback({ success: false, error: 'Player not recognized' });
    }

    const result = room.pass(player.id);
    callback(result);

    if (result.success) {
      syncRoomState(room);
      // Trigger bot turn if next turn is a bot
      room.triggerBotTurn(() => syncRoomState(room));
    }
  });

  // 11. Restart / Play Again
  socket.on('game:restart', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;

    room.restartGame();
    syncRoomState(room);
  });

  // 12. Chat Message
  socket.on('chat:send', ({ message }) => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (!room) return;
    const player = room.getPlayerBySocketId(socket.id);
    if (!player) return;

    room.addLog(`${player.displayName}: ${message.trim().slice(0, 100)}`, 'chat');
    syncRoomState(room);
  });

  // 13. Disconnect
  socket.on('disconnect', () => {
    const room = roomManager.findRoomBySocketId(socket.id);
    if (room) {
      room.handleDisconnect(socket.id);
      syncRoomState(room);
    }
  });
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
httpServer.listen(PORT, () => {
  console.log(`♠️♥️ Indonesian Poker Server running on port ${PORT} ♦️♣️`);
});
