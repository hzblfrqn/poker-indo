import { Room } from './Room.js';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();

  public createRoom(): Room {
    let roomId = this.generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = this.generateRoomCode();
    }
    const room = new Room(roomId);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase().trim());
  }

  public removeRoom(roomId: string): boolean {
    return this.rooms.delete(roomId.toUpperCase().trim());
  }

  public findRoomBySocketId(socketId: string): Room | undefined {
    for (const room of this.rooms.values()) {
      if (room.getPlayerBySocketId(socketId)) {
        return room;
      }
    }
    return undefined;
  }

  private generateRoomCode(): string {
    // 6 chars alphanumeric excluding ambiguous characters (0, O, 1, I)
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}
