export type GamePhase = 'LOBBY' | 'WORD_SELECT' | 'DRAWING' | 'ROUND_OVER' | 'GAME_OVER';

export interface PlayerAvatar {
  color: string;
  eyes: number;
  mouth: number;
}

export interface PlayerData {
  id: string;
  socketId: string;
  name: string;
  avatar: PlayerAvatar;
  score: number;
  roundScore: number;
  hasGuessed: boolean;
  guessOrder: number;
  isHost: boolean;
  isReady: boolean;
  isSpectator: boolean;
  connected: boolean;
}

export interface RoomSettings {
  maxPlayers: number;
  rounds: number;
  drawTime: number;
  wordCount: number;
  hintsCount: number;
  wordCategory: string;
  customWords: string[];
  isPublic: boolean;
}

export interface Point {
  x: number;
  y: number;
}

export type StrokeType = 'brush' | 'flood_fill' | 'clear';

export interface StrokeData {
  id: string;
  type: StrokeType;
  color: string;
  size: number;
  points: Point[];
  drawerId: string;
}

export interface ChatMessage {
  id: string;
  senderId?: string;
  senderName: string;
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close' | 'guessed_chat' | 'announcement';
  timestamp: number;
}

export interface PublicRoomInfo {
  id: string;
  code: string;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
}

export interface GameStatePayload {
  phase: GamePhase;
  round: number;
  totalRounds: number;
  drawerId: string | null;
  drawerName: string | null;
  word: string | null;
  hints: string;
  wordLength: number;
  timeLeft: number;
  drawTime: number;
  wordOptions?: string[];
  scores: Record<string, number>;
}
