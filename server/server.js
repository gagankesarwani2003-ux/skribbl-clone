const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const RoomManager = require("./RoomManager");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const roomManager = new RoomManager(io);

// Static files
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.json());

// API Endpoints
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", activeRooms: roomManager.rooms.size });
});

app.get("/api/room/:code", (req, res) => {
  const room = roomManager.getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ exists: false });
  }
  res.json({
    exists: true,
    code: room.code,
    players: room.players.size,
    state: room.state
  });
});

// Fallback to index.html for room link routes (e.g. /?room=ABCDEF)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Socket.io Connection Logic
io.on("connection", (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Create private room
  socket.on("room:create", (data, callback) => {
    try {
      const room = roomManager.createRoom(data.settings || {});
      const joinResult = roomManager.joinRoom(socket, room.code, data.name, data.avatar);
      if (typeof callback === "function") {
        callback({ success: true, roomCode: room.code, player: joinResult.player, room: room.getPublicState(socket.id) });
      }
    } catch (err) {
      console.error("[room:create error]", err);
      if (typeof callback === "function") callback({ success: false, error: err.message });
    }
  });

  // Join existing room
  socket.on("room:join", (data, callback) => {
    try {
      const result = roomManager.joinRoom(socket, data.roomCode, data.name, data.avatar);
      if (typeof callback === "function") {
        callback(result);
      }
    } catch (err) {
      console.error("[room:join error]", err);
      if (typeof callback === "function") callback({ success: false, error: err.message });
    }
  });

  // Quick Play matchmaking
  socket.on("room:quick_play", (data, callback) => {
    try {
      let room = roomManager.findAvailablePublicRoom();
      if (!room) {
        room = roomManager.createRoom({ rounds: 3, drawTime: 80 });
      }
      const result = roomManager.joinRoom(socket, room.code, data.name, data.avatar);
      if (typeof callback === "function") {
        callback(result);
      }
    } catch (err) {
      console.error("[room:quick_play error]", err);
      if (typeof callback === "function") callback({ success: false, error: err.message });
    }
  });

  // Start game (Host only)
  socket.on("game:start", (callback) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (!room) return;
    const res = room.startGame(socket.id);
    if (typeof callback === "function") callback(res);
  });

  // Drawer word selection
  socket.on("game:select_word", (word) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      room.selectWord(socket.id, word);
    }
  });

  // Real-time canvas drawing action
  socket.on("draw:action", (action) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      room.handleDrawAction(socket.id, action);
    }
  });

  // Chat / Guess submission
  socket.on("chat:message", (text) => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      room.handleChatMessage(socket.id, text);
    }
  });

  // Play Again (Host resets room back to lobby)
  socket.on("game:play_again", () => {
    const room = roomManager.getRoomBySocketId(socket.id);
    if (room) {
      const player = room.players.get(socket.id);
      if (player && player.isHost) {
        room.resetToLobby("Host started a new game!");
      }
    }
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
    roomManager.leaveRoom(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(`Skribbl Clone Server running on http://localhost:${PORT}`);
  console.log(`===============================================`);
});

module.exports = { app, server, roomManager };
