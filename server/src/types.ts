export type GamePhase = 'LOBBY' | 'WORD_SELECT' | 'DRAWING' | 'ROUND_OVER' | 'GAME_OVER';

export interface PlayerAvatar {
  color: string;
  eyes: number; // 0 to 9 index for SVG eye variants
  mouth: number; // 0 to 9 index for SVG mouth variants
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
  maxPlayers: number;     // 2 - 20
  rounds: number;         // 2 - 10
  drawTime: number;       // 15 - 240 seconds
  wordCount: number;      // 1 - 5 choices
  hintsCount: number;     // 0 - 5 hints
  wordCategory: string;   // 'all' | 'animals' | 'food' | 'objects' | 'actions' | 'custom'
  customWords: string[];  // optional host custom words
  isPublic: boolean;
}

export interface Point {
  x: number; // Normalized 0..1 to support any canvas size / responsive UI!
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
  word: string | null;       // Hidden for guessers, revealed or hinted
  hints: string;             // e.g., "_ _ a _ _"
  wordLength: number;
  timeLeft: number;
  drawTime: number;
  wordOptions?: string[];    // only sent to the active drawer
  scores: Record<string, number>;
}
