import { PlayerAvatar, PlayerData } from './types';

export class Player {
  public id: string;
  public socketId: string;
  public name: string;
  public avatar: PlayerAvatar;
  public score: number = 0;
  public roundScore: number = 0;
  public hasGuessed: boolean = false;
  public guessOrder: number = 0;
  public isHost: boolean = false;
  public isReady: boolean = true;
  public isSpectator: boolean = false;
  public connected: boolean = true;

  constructor(
    id: string,
    socketId: string,
    name: string,
    avatar?: Partial<PlayerAvatar>,
    isHost: boolean = false
  ) {
    this.id = id;
    this.socketId = socketId;
    this.name = name.trim() || `Player_${Math.floor(1000 + Math.random() * 9000)}`;
    this.avatar = {
      color: avatar?.color || '#3b82f6',
      eyes: avatar?.eyes !== undefined ? avatar.eyes : Math.floor(Math.random() * 5),
      mouth: avatar?.mouth !== undefined ? avatar.mouth : Math.floor(Math.random() * 5)
    };
    this.isHost = isHost;
  }

  public resetRound(): void {
    this.hasGuessed = false;
    this.roundScore = 0;
    this.guessOrder = 0;
  }

  public resetGame(): void {
    this.score = 0;
    this.resetRound();
  }

  public addScore(points: number): void {
    this.roundScore += points;
    this.score += points;
  }

  public toJSON(): PlayerData {
    return {
      id: this.id,
      socketId: this.socketId,
      name: this.name,
      avatar: this.avatar,
      score: this.score,
      roundScore: this.roundScore,
      hasGuessed: this.hasGuessed,
      guessOrder: this.guessOrder,
      isHost: this.isHost,
      isReady: this.isReady,
      isSpectator: this.isSpectator,
      connected: this.connected
    };
  }
}
