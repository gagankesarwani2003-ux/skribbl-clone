import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { RoomManager } from './RoomManager';
import { StrokeData } from './types';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB for stroke batches
});

const roomManager = new RoomManager(io);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Get active public rooms
app.get('/api/rooms', (req, res) => {
  res.json({
    rooms: roomManager.getPublicRooms()
  });
});

// Serve frontend build in production
const clientDistPath = path.resolve(__dirname, '../../client/dist');
app.use(express.static(clientDistPath));

app.get('*', (req, res, next) => {
  // If not an API route, serve index.html
  if (!req.path.startsWith('/api')) {
    const indexPath = path.join(clientDistPath, 'index.html');
    res.sendFile(indexPath, (err) => {
      if (err) {
        next();
      }
    });
  } else {
    next();
  }
});

// Socket.IO Events
io.on('connection', (socket) => {
  // 1. Create Room
  socket.on('create_room', (data, callback) => {
    try {
      const { hostName, avatar, settings } = data || {};
      const { room, player } = roomManager.createRoom(
        socket,
        hostName || 'Host',
        avatar || { color: '#3b82f6', eyes: 0, mouth: 0 },
        settings || {}
      );

      const response = {
        success: true,
        roomId: room.id,
        roomCode: room.code,
        player: player.toJSON(),
        settings: room.settings
      };

      if (typeof callback === 'function') callback(response);
      socket.emit('room_created', response);
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 2. Join Room
  socket.on('join_room', (data, callback) => {
    try {
      const { roomId, playerName, avatar } = data || {};
      const result = roomManager.joinRoom(
        socket,
        roomId || '',
        playerName || 'Guesser',
        avatar || { color: '#10b981', eyes: 0, mouth: 0 }
      );

      if (!result.success || !result.room || !result.player) {
        const errorResp = { success: false, error: result.error || 'Failed to join room' };
        if (typeof callback === 'function') callback(errorResp);
        socket.emit('join_error', errorResp);
        return;
      }

      const response = {
        success: true,
        roomId: result.room.id,
        roomCode: result.room.code,
        player: result.player.toJSON(),
        settings: result.room.settings,
        gameState: result.room.game.getStatePayload(result.player.id),
        players: result.room.getPlayerList()
      };

      if (typeof callback === 'function') callback(response);
      socket.emit('room_joined', response);

      // Send initial canvas history if round is active
      result.room.sendStrokeHistory(socket);
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 3. Quick Join Public Room
  socket.on('quick_join', (data, callback) => {
    try {
      const { playerName, avatar } = data || {};
      const result = roomManager.quickJoin(
        socket,
        playerName || 'Guesser',
        avatar || { color: '#f59e0b', eyes: 0, mouth: 0 }
      );

      if (!result.success || !result.room || !result.player) {
        const errorResp = { success: false, error: result.error || 'No rooms available' };
        if (typeof callback === 'function') callback(errorResp);
        socket.emit('join_error', errorResp);
        return;
      }

      const response = {
        success: true,
        roomId: result.room.id,
        roomCode: result.room.code,
        player: result.player.toJSON(),
        settings: result.room.settings,
        gameState: result.room.game.getStatePayload(result.player.id),
        players: result.room.getPlayerList()
      };

      if (typeof callback === 'function') callback(response);
      socket.emit('room_joined', response);
      result.room.sendStrokeHistory(socket);
    } catch (err: any) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  // 4. Get Public Rooms
  socket.on('get_public_rooms', (callback) => {
    const list = roomManager.getPublicRooms();
    if (typeof callback === 'function') callback({ rooms: list });
    socket.emit('public_rooms_list', { rooms: list });
  });

  // 5. Start Game (Host only)
  socket.on('start_game', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.get(room.socketToPlayerId.get(socket.id) || '');
    if (!player || !player.isHost) {
      socket.emit('error_message', { message: 'Only host can start the game!' });
      return;
    }

    if (room.players.size < 2) {
      socket.emit('error_message', { message: 'At least 2 players are needed to start the game!' });
      return;
    }

    room.game.start();
  });

  // 6. Update Settings (Host only)
  socket.on('update_settings', (newSettings) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const player = room.players.get(room.socketToPlayerId.get(socket.id) || '');
    if (player && player.isHost) {
      room.updateSettings(newSettings);
    }
  });

  // 7. Choose Word (Active Drawer only)
  socket.on('word_chosen', ({ word }: { word: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (room.game.currentDrawerId !== playerId) return;

    room.game.chooseWord(word);
  });

  // 8. Drawing: stroke drawing event
  socket.on('draw_data', (stroke: StrokeData) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (room.game.currentDrawerId !== playerId || room.game.phase !== 'DRAWING') return;

    room.handleStroke(stroke);
  });

  // 9. Canvas Clear (Active Drawer only)
  socket.on('canvas_clear', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (room.game.currentDrawerId !== playerId || room.game.phase !== 'DRAWING') return;

    room.handleClear();
  });

  // 10. Draw Undo (Active Drawer only)
  socket.on('draw_undo', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (room.game.currentDrawerId !== playerId || room.game.phase !== 'DRAWING') return;

    room.handleUndo();
  });

  // 11. Request stroke history (e.g. on canvas resize or reconnect)
  socket.on('request_stroke_history', () => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (room) {
      room.sendStrokeHistory(socket);
    }
  });

  // 12. Chat & Guess
  socket.on('chat', ({ text }: { text: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (!playerId) return;
    const player = room.players.get(playerId);
    if (!player) return;

    room.handleChatOrGuess(player, text);
  });

  socket.on('guess', ({ text }: { text: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const playerId = room.socketToPlayerId.get(socket.id);
    if (!playerId) return;
    const player = room.players.get(playerId);
    if (!player) return;

    room.handleChatOrGuess(player, text);
  });

  // 13. Kick Player (Host only)
  socket.on('kick_player', ({ targetPlayerId }: { targetPlayerId: string }) => {
    const room = roomManager.getRoomBySocket(socket.id);
    if (!room) return;
    const initiatorId = room.socketToPlayerId.get(socket.id);
    if (!initiatorId) return;

    room.kickPlayer(targetPlayerId, initiatorId);
  });

  // 14. Disconnect
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`🎨 Skribbl backend server running on port ${PORT}`);
});
