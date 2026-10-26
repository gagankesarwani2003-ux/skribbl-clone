const GameRoom = require("./GameRoom");

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomCode -> GameRoom
    this.playerRoomMap = new Map(); // socket.id -> roomCode
  }

  generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return this.rooms.has(code) ? this.generateRoomCode() : code;
  }

  createRoom(options = {}) {
    const code = this.generateRoomCode();
    const room = new GameRoom(code, this.io, options);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    if (!code) return null;
    return this.rooms.get(code.toUpperCase().trim()) || null;
  }

  findAvailablePublicRoom() {
    for (const room of this.rooms.values()) {
      if (room.state === "LOBBY" && room.players.size < 8) {
        return room;
      }
    }
    return null;
  }

  joinRoom(socket, roomCode, playerName, avatar) {
    // Leave previous room if any
    this.leaveRoom(socket.id);

    const room = this.getRoom(roomCode);
    if (!room) {
      return { success: false, error: "Room not found." };
    }

    if (room.players.size >= 12) {
      return { success: false, error: "Room is full (max 12 players)." };
    }

    const player = room.addPlayer(socket, playerName, avatar);
    this.playerRoomMap.set(socket.id, room.code);

    return { success: true, room: room.getPublicState(socket.id), player };
  }

  leaveRoom(socketId) {
    const roomCode = this.playerRoomMap.get(socketId);
    if (!roomCode) return;

    const room = this.rooms.get(roomCode);
    if (room) {
      room.removePlayer(socketId);

      // Clean up empty rooms
      if (room.players.size === 0) {
        room.clearTimer();
        this.rooms.delete(roomCode);
      }
    }
    this.playerRoomMap.delete(socketId);
  }

  getRoomBySocketId(socketId) {
    const code = this.playerRoomMap.get(socketId);
    return code ? this.rooms.get(code) : null;
  }
}

module.exports = RoomManager;
