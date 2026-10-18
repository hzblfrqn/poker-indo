import { io, Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '@shared/types';

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    const envUrl = import.meta.env.VITE_SERVER_URL;
    const serverUrl =
      envUrl ||
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:4000'
        : window.location.origin);

    socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('Connected to Indonesian Poker server with socket id:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.warn('Disconnected from server:', reason);
    });
  }

  return socket;
}
