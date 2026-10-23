import { Server, Socket } from 'socket.io';
import {
  ChatMessage,
  GameStatePayload,
  PlayerData,
  PublicRoomInfo,
  RoomSettings,
  StrokeData
} from './types';
import { Player } from './Player';
import { Game } from './Game';

export class Room {
  public id: string;
  public code: string;
  public settings: RoomSettings;
  public hostId: string;
  public players: Map<string, Player> = new Map();
  public socketToPlayerId: Map<string, string> = new Map();
  public chatMessages: ChatMessage[] = [];
  public game: Game;
  private io: Server;

  constructor(id: string, code: string, hostPlayer: Player, settings: Partial<RoomSettings>, io: Server) {
    this.id = id;
    this.code = code;
    this.hostId = hostPlayer.id;
    this.io = io;

    this.settings = {
      maxPlayers: Math.min(20, Math.max(2, settings.maxPlayers || 8)),
      rounds: Math.min(10, Math.max(2, settings.rounds || 3)),
      drawTime: Math.min(240, Math.max(15, settings.drawTime || 80)),
      wordCount: Math.min(5, Math.max(1, settings.wordCount || 3)),
      hintsCount: Math.min(5, Math.max(0, settings.hintsCount !== undefined ? settings.hintsCount : 2)),
      wordCategory: settings.wordCategory || 'all',
      customWords: settings.customWords || [],
      isPublic: settings.isPublic !== undefined ? settings.isPublic : true
    };

    this.game = new Game(this.settings, () => Array.from(this.players.values()), {
      onStateUpdate: () => this.broadcastGameState(),
      onTimeTick: (timeLeft: number) => this.io.to(this.id).emit('time_tick', { timeLeft }),
      onRoundStart: (drawerId: string, wordOptions: string[], drawTime: number) => {
        // Send word options only to the drawer!
        const drawer = this.players.get(drawerId);
        if (drawer) {
          this.io.to(drawer.socketId).emit('round_start', {
            drawerId,
            wordOptions,
            drawTime
          });
        }
        // Broadcast to others without word options
        this.io.to(this.id).emit('round_start_notice', {
          drawerId,
          drawerName: drawer?.name || 'Someone',
          drawTime
        });
        this.addSystemMessage(`Round ${this.game.currentRound}: ${drawer?.name || 'Drawer'} is choosing a word!`);
      },
      onWordChosen: (drawerId: string, wordLength: number, mask: string) => {
        const drawer = this.players.get(drawerId);
        this.io.to(this.id).emit('word_chosen', {
          drawerId,
          wordLength,
          hints: mask
        });
        this.addSystemMessage(`${drawer?.name || 'Drawer'} chose a word! Start guessing!`);
      },
      onHintUpdate: (mask: string) => {
        this.io.to(this.id).emit('hint_revealed', { hints: mask });
      },
      onPlayerGuessed: (player: Player, points: number, isFirst: boolean) => {
        // Broadcast guess result
        this.io.to(this.id).emit('guess_result', {
          correct: true,
          playerId: player.id,
          playerName: player.name,
          points,
          isFirst
        });

        const announcement = isFirst
          ? `🌟 ${player.name} guessed the word FIRST! (+${points} pts)`
          : `🎉 ${player.name} guessed the word! (+${points} pts)`;

        this.addChatMessage({
          id: `msg_${Date.now()}_${Math.random()}`,
          senderName: 'Game',
          text: announcement,
          type: 'correct',
          timestamp: Date.now()
        });

        // Send full word to this player now that they guessed correctly
        this.io.to(player.socketId).emit('word_revealed_to_player', {
          word: this.game.currentWord
        });
      },
      onCloseGuess: (playerId: string, guess: string) => {
        const player = this.players.get(playerId);
        if (player) {
          this.io.to(player.socketId).emit('chat_message', {
            id: `msg_close_${Date.now()}`,
            senderName: 'System',
            text: `'${guess}' is very close!`,
            type: 'close',
            timestamp: Date.now()
          });
        }
      },
      onRoundEnd: (word: string, scores: Record<string, number>, nextDrawerId: string | null) => {
        const nextDrawer = nextDrawerId ? this.players.get(nextDrawerId) : null;
        this.io.to(this.id).emit('round_end', {
          word,
          scores,
          nextDrawer: nextDrawer ? { id: nextDrawer.id, name: nextDrawer.name } : null
        });
        this.addSystemMessage(`The word was: "${word.toUpperCase()}"!`);
      },
      onGameOver: (winner: PlayerData, leaderboard: PlayerData[]) => {
        this.io.to(this.id).emit('game_over', {
          winner,
          leaderboard
        });
        this.addSystemMessage(`🏆 Game Over! Winner: ${winner.name} with ${winner.score} points!`);
      }
    });

    this.addPlayer(hostPlayer);
  }

  public addPlayer(player: Player): boolean {
    if (this.players.size >= this.settings.maxPlayers && !this.players.has(player.id)) {
      return false;
    }

    const isNew = !this.players.has(player.id);
    this.players.set(player.id, player);
    this.socketToPlayerId.set(player.socketId, player.id);

    if (isNew) {
      this.addSystemMessage(`${player.name} joined the room.`);
    }

    this.broadcastPlayerList();
    this.broadcastGameState();
    return true;
  }

  public removePlayer(socketId: string): void {
    const playerId = this.socketToPlayerId.get(socketId);
    if (!playerId) return;

    const player = this.players.get(playerId);
    if (!player) return;

    this.socketToPlayerId.delete(socketId);
    this.players.delete(playerId);

    this.addSystemMessage(`${player.name} left the room.`);
    this.io.to(this.id).emit('player_left', {
      playerId,
      players: this.getPlayerList()
    });

    // Handle host reassignment if host leaves
    if (this.hostId === playerId && this.players.size > 0) {
      const nextHost = Array.from(this.players.values())[0];
      nextHost.isHost = true;
      this.hostId = nextHost.id;
      this.addSystemMessage(`${nextHost.name} is now the room host.`);
    }

    this.game.handlePlayerDisconnect(playerId);
    this.broadcastPlayerList();
    this.broadcastGameState();
  }

  public updateSettings(newSettings: Partial<RoomSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.game.updateSettings(this.settings);
    this.io.to(this.id).emit('room_settings_updated', this.settings);
    this.addSystemMessage('Room settings were updated by the host.');
  }

  public handleStroke(stroke: StrokeData): void {
    this.game.drawingManager.addStroke(stroke);
    // Broadcast stroke to everyone in the room (including drawer for guaranteed consistency)
    this.io.to(this.id).emit('draw_data', stroke);
  }

  public handleUndo(): void {
    this.game.drawingManager.undo();
    this.io.to(this.id).emit('draw_undo', {
      history: this.game.drawingManager.getHistory()
    });
  }

  public handleClear(): void {
    this.game.drawingManager.clear();
    this.io.to(this.id).emit('canvas_clear');
  }

  public sendStrokeHistory(socket: Socket): void {
    socket.emit('draw_history', {
      history: this.game.drawingManager.getHistory()
    });
  }

  public handleChatOrGuess(player: Player, text: string): void {
    const cleanText = text.trim();
    if (!cleanText) return;

    // In drawing phase and player hasn't guessed yet
    if (this.game.phase === 'DRAWING' && player.id !== this.game.currentDrawerId && !player.hasGuessed) {
      const result = this.game.handleGuess(player, cleanText);
      if (result.status === 'correct') {
        return; // Guess handled by Game events
      }
      if (result.status === 'close') {
        return; // Close warning handled privately
      }
    }

    // If player has already guessed in drawing phase, their chat should not reveal the word to unguessed players!
    if (this.game.phase === 'DRAWING' && player.hasGuessed) {
      const msg: ChatMessage = {
        id: `msg_${Date.now()}_${Math.random()}`,
        senderId: player.id,
        senderName: player.name,
        text: cleanText,
        type: 'guessed_chat',
        timestamp: Date.now()
      };
      this.chatMessages.push(msg);

      // Only send to drawer and other players who have guessed!
      this.players.forEach(p => {
        if (p.hasGuessed || p.id === this.game.currentDrawerId) {
          this.io.to(p.socketId).emit('chat_message', msg);
        }
      });
      return;
    }

    // Regular chat message to all
    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random()}`,
      senderId: player.id,
      senderName: player.name,
      text: cleanText,
      type: 'chat',
      timestamp: Date.now()
    };
    this.chatMessages.push(msg);
    this.io.to(this.id).emit('chat_message', msg);
  }

  public addSystemMessage(text: string): void {
    const msg: ChatMessage = {
      id: `sys_${Date.now()}_${Math.random()}`,
      senderName: 'System',
      text,
      type: 'system',
      timestamp: Date.now()
    };
    this.chatMessages.push(msg);
    this.io.to(this.id).emit('chat_message', msg);
  }

  public addChatMessage(msg: ChatMessage): void {
    this.chatMessages.push(msg);
    this.io.to(this.id).emit('chat_message', msg);
  }

  public broadcastPlayerList(): void {
    const list = this.getPlayerList();
    this.io.to(this.id).emit('player_list', list);
  }

  public broadcastGameState(): void {
    // Send customized game state payload to each player (to protect secret word!)
    this.players.forEach(player => {
      const state = this.game.getStatePayload(player.id);
      this.io.to(player.socketId).emit('game_state', state);
    });
  }

  public getPlayerList(): PlayerData[] {
    return Array.from(this.players.values()).map(p => p.toJSON());
  }

  public kickPlayer(targetPlayerId: string, initiatorPlayerId: string): boolean {
    if (this.hostId !== initiatorPlayerId) return false;
    const target = this.players.get(targetPlayerId);
    if (!target) return false;

    this.io.to(target.socketId).emit('kicked', { reason: 'Kicked by room host.' });
    this.removePlayer(target.socketId);
    return true;
  }

  public toPublicInfo(): PublicRoomInfo {
    const host = this.players.get(this.hostId);
    return {
      id: this.id,
      code: this.code,
      hostName: host ? host.name : 'Unknown',
      playerCount: this.players.size,
      maxPlayers: this.settings.maxPlayers,
      phase: this.game.phase,
      currentRound: this.game.currentRound,
      totalRounds: this.settings.rounds
    };
  }

  public cleanup(): void {
    this.game.cleanup();
  }
}
