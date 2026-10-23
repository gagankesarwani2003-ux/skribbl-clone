import React, { useState, useEffect } from 'react';
import { socket } from './services/socket';
import { sound } from './services/audio';
import {
  ChatMessage,
  GameStatePayload,
  PlayerData,
  PlayerAvatar,
  RoomSettings
} from './types';
import { Home } from './components/Home';
import { Lobby } from './components/Lobby';
import { GameScreen } from './components/GameScreen';

export const App: React.FC = () => {
  const [screen, setScreen] = useState<'HOME' | 'LOBBY' | 'GAME'>('HOME');
  const [roomCode, setRoomCode] = useState<string>('');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isHost, setIsHost] = useState<boolean>(false);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [settings, setSettings] = useState<RoomSettings>({
    maxPlayers: 8,
    rounds: 3,
    drawTime: 80,
    wordCount: 3,
    hintsCount: 2,
    wordCategory: 'all',
    customWords: [],
    isPublic: true
  });
  const [gameState, setGameState] = useState<GameStatePayload>({
    phase: 'LOBBY',
    round: 1,
    totalRounds: 3,
    drawerId: null,
    drawerName: null,
    word: null,
    hints: '',
    wordLength: 0,
    timeLeft: 0,
    drawTime: 80,
    scores: {}
  });
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [winner, setWinner] = useState<PlayerData | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerData[]>([]);

  // Check URL query param for invite link (?room=CODE)
  const [urlRoomCode, setUrlRoomCode] = useState<string>('');
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('room');
    if (code) {
      setUrlRoomCode(code.toUpperCase());
    }
  }, []);

  useEffect(() => {
    // 1. Room Creation / Join Callbacks
    socket.on('room_created', (data) => {
      setRoomCode(data.roomCode);
      setCurrentUserId(data.player.id);
      setIsHost(true);
      setSettings(data.settings);
      setPlayers([data.player]);
      setScreen('LOBBY');
    });

    socket.on('room_joined', (data) => {
      setRoomCode(data.roomCode);
      setCurrentUserId(data.player.id);
      setIsHost(data.player.isHost);
      setSettings(data.settings);
      setPlayers(data.players || [data.player]);
      if (data.gameState && data.gameState.phase !== 'LOBBY') {
        setGameState(data.gameState);
        setScreen('GAME');
      } else {
        setScreen('LOBBY');
      }
    });

    socket.on('join_error', (data) => {
      alert(data.error || 'Failed to join room');
    });

    // 2. Players list updates
    socket.on('player_list', (list: PlayerData[]) => {
      setPlayers(list);
      // Update host status if host changed
      const me = list.find((p) => p.id === currentUserId);
      if (me) {
        setIsHost(me.isHost);
      }
    });

    // 3. Settings updates
    socket.on('room_settings_updated', (newSettings: RoomSettings) => {
      setSettings(newSettings);
    });

    // 4. Game State updates
    socket.on('game_state', (state: GameStatePayload) => {
      setGameState(state);
      if (state.phase !== 'LOBBY') {
        setScreen('GAME');
      }
    });

    // 5. Time tick
    socket.on('time_tick', ({ timeLeft }: { timeLeft: number }) => {
      setGameState((prev) => ({ ...prev, timeLeft }));
      if (timeLeft <= 5 && timeLeft > 0) {
        sound.playTick();
      }
    });

    // 6. Round start (Drawer specific)
    socket.on('round_start', ({ drawerId, wordOptions, drawTime }) => {
      sound.playRoundStart();
      setGameState((prev) => ({
        ...prev,
        phase: 'WORD_SELECT',
        drawerId,
        wordOptions,
        drawTime,
        timeLeft: 15
      }));
    });

    // Round start notice (All players)
    socket.on('round_start_notice', ({ drawerId, drawerName, drawTime }) => {
      sound.playRoundStart();
      setGameState((prev) => ({
        ...prev,
        phase: 'WORD_SELECT',
        drawerId,
        drawerName,
        drawTime,
        timeLeft: 15
      }));
    });

    // 7. Word chosen
    socket.on('word_chosen', ({ hints, wordLength, drawerId }) => {
      setGameState((prev) => ({
        ...prev,
        phase: 'DRAWING',
        hints,
        wordLength,
        drawerId
      }));
    });

    // 8. Hint revealed
    socket.on('hint_revealed', ({ hints }: { hints: string }) => {
      setGameState((prev) => ({ ...prev, hints }));
    });

    // 9. Word revealed to guesser
    socket.on('word_revealed_to_player', ({ word }: { word: string }) => {
      setGameState((prev) => ({ ...prev, word }));
    });

    // 10. Guess result
    socket.on('guess_result', (data) => {
      sound.playCorrect();
    });

    // 11. Chat messages
    socket.on('chat_message', (msg: ChatMessage) => {
      setChatMessages((prev) => [...prev, msg]);
    });

    // 12. Round end
    socket.on('round_end', ({ word, scores }) => {
      sound.playRoundEnd();
      setGameState((prev) => ({
        ...prev,
        phase: 'ROUND_OVER',
        word,
        scores: scores || prev.scores
      }));
    });

    // 13. Game over
    socket.on('game_over', ({ winner, leaderboard }) => {
      setWinner(winner);
      setLeaderboard(leaderboard);
      setGameState((prev) => ({ ...prev, phase: 'GAME_OVER' }));
    });

    // 14. Kicked notification
    socket.on('kicked', ({ reason }) => {
      alert(reason || 'You have been kicked from the room.');
      setScreen('HOME');
    });

    return () => {
      socket.off('room_created');
      socket.off('room_joined');
      socket.off('join_error');
      socket.off('player_list');
      socket.off('room_settings_updated');
      socket.off('game_state');
      socket.off('time_tick');
      socket.off('round_start');
      socket.off('round_start_notice');
      socket.off('word_chosen');
      socket.off('hint_revealed');
      socket.off('word_revealed_to_player');
      socket.off('guess_result');
      socket.off('chat_message');
      socket.off('round_end');
      socket.off('game_over');
      socket.off('kicked');
    };
  }, [currentUserId]);

  const handleCreateRoom = (hostName: string, avatar: PlayerAvatar) => {
    socket.emit('create_room', { hostName, avatar, settings });
  };

  const handleJoinRoom = (code: string, playerName: string, avatar: PlayerAvatar) => {
    socket.emit('join_room', { roomId: code, playerName, avatar });
  };

  const handleQuickJoin = (playerName: string, avatar: PlayerAvatar) => {
    socket.emit('quick_join', { playerName, avatar });
  };

  const handleLeaveRoom = () => {
    window.location.href = window.location.origin;
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
      {screen === 'HOME' && (
        <Home
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onQuickJoin={handleQuickJoin}
          initialRoomCode={urlRoomCode}
        />
      )}

      {screen === 'LOBBY' && (
        <Lobby
          roomCode={roomCode}
          players={players}
          settings={settings}
          currentUserId={currentUserId}
          isHost={isHost}
          onLeave={handleLeaveRoom}
        />
      )}

      {screen === 'GAME' && (
        <GameScreen
          gameState={gameState}
          players={players}
          currentUserId={currentUserId}
          isHost={isHost}
          settings={settings}
          chatMessages={chatMessages}
          winner={winner}
          leaderboard={leaderboard}
          onExit={handleLeaveRoom}
        />
      )}
    </div>
  );
};
