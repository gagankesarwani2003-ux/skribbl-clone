import { Server, Socket } from 'socket.io';
import { Player } from './Player';
import { Room } from './Room';
import { PlayerAvatar, PublicRoomInfo, RoomSettings } from './types';

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private codeToRoomId: Map<string, string> = new Map();
  private socketToRoomId: Map<string, string> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;

    // Periodically remove empty rooms every 60 seconds
    setInterval(() => {
      this.cleanupEmptyRooms();
    }, 60000);
  }

  public createRoom(
    hostSocket: Socket,
    hostName: string,
    avatar: PlayerAvatar,
    settings: Partial<RoomSettings> = {}
  ): { room: Room; player: Player } {
    const roomId = `room_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const code = this.generateRoomCode();
    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const hostPlayer = new Player(playerId, hostSocket.id, hostName, avatar, true);
    const room = new Room(roomId, code, hostPlayer, settings, this.io);

    this.rooms.set(roomId, room);
    this.codeToRoomId.set(code.toUpperCase(), roomId);
    this.socketToRoomId.set(hostSocket.id, roomId);

    hostSocket.join(roomId);

    return { room, player: hostPlayer };
  }

  public joinRoom(
    socket: Socket,
    roomCodeOrId: string,
    playerName: string,
    avatar: PlayerAvatar
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    const cleanIdentifier = roomCodeOrId.trim().toUpperCase();
    const roomId = this.codeToRoomId.get(cleanIdentifier) || roomCodeOrId.trim();
    const room = this.rooms.get(roomId);

    if (!room) {
      return { success: false, error: 'Room not found! Check code or link.' };
    }

    if (room.players.size >= room.settings.maxPlayers) {
      return { success: false, error: 'Room is already full!' };
    }

    const playerId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newPlayer = new Player(playerId, socket.id, playerName, avatar, false);

    const added = room.addPlayer(newPlayer);
    if (!added) {
      return { success: false, error: 'Could not join room.' };
    }

    this.socketToRoomId.set(socket.id, room.id);
    socket.join(room.id);

    return { success: true, room, player: newPlayer };
  }

  public quickJoin(
    socket: Socket,
    playerName: string,
    avatar: PlayerAvatar
  ): { success: boolean; room?: Room; player?: Player; error?: string } {
    // Look for an open public room in LOBBY or DRAWING with available capacity
    const availableRooms = Array.from(this.rooms.values()).filter(
      r => r.settings.isPublic && r.players.size < r.settings.maxPlayers && r.game.phase !== 'GAME_OVER'
    );

    if (availableRooms.length > 0) {
      // Pick room with highest player count that isn't full (most fun!)
      availableRooms.sort((a, b) => b.players.size - a.players.size);
      return this.joinRoom(socket, availableRooms[0].code, playerName, avatar);
    }

    // No open public room available: create a new public room!
    const { room, player } = this.createRoom(socket, playerName, avatar, { isPublic: true });
    return { success: true, room, player };
  }

  public handleDisconnect(socketId: string): void {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return;

    this.socketToRoomId.delete(socketId);
    const room = this.rooms.get(roomId);
    if (room) {
      room.removePlayer(socketId);
      if (room.players.size === 0) {
        room.cleanup();
        this.rooms.delete(roomId);
        this.codeToRoomId.delete(room.code);
      }
    }
  }

  public getRoomBySocket(socketId: string): Room | undefined {
    const roomId = this.socketToRoomId.get(socketId);
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  public getPublicRooms(): PublicRoomInfo[] {
    return Array.from(this.rooms.values())
      .filter(r => r.settings.isPublic && r.players.size > 0 && r.game.phase !== 'GAME_OVER')
      .map(r => r.toPublicInfo());
  }

  private generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.codeToRoomId.has(code));
    return code;
  }

  private cleanupEmptyRooms(): void {
    for (const [roomId, room] of this.rooms.entries()) {
      if (room.players.size === 0) {
        room.cleanup();
        this.rooms.delete(roomId);
        this.codeToRoomId.delete(room.code);
      }
    }
  }
}
