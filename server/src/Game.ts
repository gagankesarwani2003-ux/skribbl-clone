import { GamePhase, GameStatePayload, PlayerData, RoomSettings } from './types';
import { Player } from './Player';
import { DrawingManager } from './DrawingManager';
import { WordService } from './WordService';

export interface GameEvents {
  onStateUpdate: () => void;
  onTimeTick: (timeLeft: number) => void;
  onRoundStart: (drawerId: string, wordOptions: string[], drawTime: number) => void;
  onWordChosen: (drawerId: string, wordLength: number, mask: string) => void;
  onHintUpdate: (mask: string) => void;
  onPlayerGuessed: (player: Player, points: number, isFirst: boolean) => void;
  onCloseGuess: (playerId: string, guess: string) => void;
  onRoundEnd: (word: string, scores: Record<string, number>, nextDrawerId: string | null) => void;
  onGameOver: (winner: PlayerData, leaderboard: PlayerData[]) => void;
}

export class Game {
  public phase: GamePhase = 'LOBBY';
  public currentRound: number = 0;
  public totalRounds: number = 3;
  public drawTime: number = 80;
  public timeLeft: number = 0;
  public currentWord: string | null = null;
  public wordOptions: string[] = [];
  public currentDrawerId: string | null = null;
  public drawingManager: DrawingManager = new DrawingManager();

  private getPlayers: () => Player[];
  private settings: RoomSettings;
  private events: GameEvents;
  private timer: NodeJS.Timeout | null = null;
  private drawerQueue: string[] = [];
  private revealedIndices: Set<number> = new Set();
  private hintsGiven: number = 0;
  private correctGuessesCount: number = 0;

  constructor(
    settings: RoomSettings,
    getPlayers: () => Player[],
    events: GameEvents
  ) {
    this.settings = settings;
    this.totalRounds = settings.rounds;
    this.drawTime = settings.drawTime;
    this.getPlayers = getPlayers;
    this.events = events;
  }

  public updateSettings(settings: RoomSettings): void {
    this.settings = settings;
    this.totalRounds = settings.rounds;
    this.drawTime = settings.drawTime;
  }

  public start(): boolean {
    const activePlayers = this.getActivePlayers();
    if (activePlayers.length < 2) return false;

    this.currentRound = 1;
    this.drawerQueue = activePlayers.map(p => p.id);
    activePlayers.forEach(p => p.resetGame());
    this.startRound();
    return true;
  }

  private startRound(): void {
    this.clearTimer();
    this.drawingManager.reset();
    this.revealedIndices.clear();
    this.hintsGiven = 0;
    this.correctGuessesCount = 0;

    const activePlayers = this.getActivePlayers();
    activePlayers.forEach(p => p.resetRound());

    if (this.drawerQueue.length === 0) {
      if (this.currentRound >= this.totalRounds) {
        this.endGame();
        return;
      }
      this.currentRound++;
      this.drawerQueue = activePlayers.map(p => p.id);
    }

    this.currentDrawerId = this.drawerQueue.shift() || null;
    if (!this.currentDrawerId) {
      this.endGame();
      return;
    }

    this.phase = 'WORD_SELECT';
    this.wordOptions = WordService.getWordOptions(
      this.settings.wordCategory,
      this.settings.customWords,
      this.settings.wordCount || 3
    );

    this.events.onRoundStart(this.currentDrawerId, this.wordOptions, this.drawTime);
    this.events.onStateUpdate();

    // Drawer has 15 seconds to pick a word; if not chosen, auto-pick first option
    this.timeLeft = 15;
    this.timer = setInterval(() => {
      this.timeLeft--;
      this.events.onTimeTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.chooseWord(this.wordOptions[0] || 'apple');
      }
    }, 1000);
  }

  public chooseWord(word: string): boolean {
    if (this.phase !== 'WORD_SELECT') return false;
    this.clearTimer();

    this.currentWord = word.trim().toLowerCase();
    this.phase = 'DRAWING';
    this.timeLeft = this.drawTime;

    // Mask with spaces/hyphens revealed
    const mask = WordService.generateMask(this.currentWord, this.revealedIndices);
    if (this.currentDrawerId) {
      this.events.onWordChosen(this.currentDrawerId, this.currentWord.length, mask);
    }
    this.events.onStateUpdate();

    this.timer = setInterval(() => {
      this.timeLeft--;
      this.events.onTimeTick(this.timeLeft);

      this.checkHintSchedule();

      if (this.timeLeft <= 0) {
        this.endRound();
      }
    }, 1000);

    return true;
  }

  private checkHintSchedule(): void {
    if (!this.currentWord || this.settings.hintsCount <= 0) return;

    // Calculate when hints should trigger
    // E.g., for 2 hints: trigger when time reaches 66% and 33%
    const totalHintsAllowed = Math.min(
      this.settings.hintsCount,
      Math.max(1, Math.floor(this.currentWord.replace(/\s+/g, '').length / 2))
    );

    if (this.hintsGiven >= totalHintsAllowed) return;

    const interval = this.drawTime / (totalHintsAllowed + 1);
    const expectedHintsAtThisTime = Math.floor((this.drawTime - this.timeLeft) / interval);

    if (expectedHintsAtThisTime > this.hintsGiven) {
      this.revealNextHint();
    }
  }

  private revealNextHint(): void {
    if (!this.currentWord) return;

    const unrevealed: number[] = [];
    for (let i = 0; i < this.currentWord.length; i++) {
      if (this.currentWord[i] !== ' ' && this.currentWord[i] !== '-' && !this.revealedIndices.has(i)) {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length > 0) {
      const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      this.revealedIndices.add(randomIndex);
      this.hintsGiven++;
      const mask = WordService.generateMask(this.currentWord, this.revealedIndices);
      this.events.onHintUpdate(mask);
    }
  }

  public handleGuess(player: Player, guessText: string): { status: 'correct' | 'close' | 'incorrect' } {
    if (this.phase !== 'DRAWING' || !this.currentWord) {
      return { status: 'incorrect' };
    }

    // Drawer cannot guess their own word
    if (player.id === this.currentDrawerId) {
      return { status: 'incorrect' };
    }

    // Player already guessed
    if (player.hasGuessed) {
      return { status: 'incorrect' };
    }

    if (WordService.isCorrectGuess(guessText, this.currentWord)) {
      this.correctGuessesCount++;
      player.hasGuessed = true;
      player.guessOrder = this.correctGuessesCount;

      // Calculate score based on time remaining
      // Scale: 100 base + up to 400 based on time + 50 for first
      const timeBonus = Math.floor((this.timeLeft / this.drawTime) * 400);
      const isFirst = this.correctGuessesCount === 1;
      const points = 100 + timeBonus + (isFirst ? 50 : 0);
      player.addScore(points);

      // Award points to drawer as well!
      const drawer = this.getPlayers().find(p => p.id === this.currentDrawerId);
      if (drawer) {
        const drawerPoints = 50 + Math.floor((this.timeLeft / this.drawTime) * 50);
        drawer.addScore(drawerPoints);
      }

      this.events.onPlayerGuessed(player, points, isFirst);
      this.events.onStateUpdate();

      // Check if all non-drawers have guessed
      const nonDrawers = this.getActivePlayers().filter(
        p => p.id !== this.currentDrawerId && !p.isSpectator
      );
      const allGuessed = nonDrawers.every(p => p.hasGuessed);

      if (allGuessed && nonDrawers.length > 0) {
        // Fast end the round
        this.endRound();
      }

      return { status: 'correct' };
    }

    if (WordService.isGuessClose(guessText, this.currentWord)) {
      this.events.onCloseGuess(player.id, guessText);
      return { status: 'close' };
    }

    return { status: 'incorrect' };
  }

  public endRound(): void {
    this.clearTimer();
    this.phase = 'ROUND_OVER';

    const revealedWord = this.currentWord || '';
    const scores: Record<string, number> = {};
    this.getPlayers().forEach(p => {
      scores[p.id] = p.score;
    });

    const nextDrawerId = this.drawerQueue.length > 0
      ? this.drawerQueue[0]
      : (this.currentRound < this.totalRounds ? this.getActivePlayers()[0]?.id || null : null);

    this.events.onRoundEnd(revealedWord, scores, nextDrawerId);
    this.events.onStateUpdate();

    // 5 seconds round recap, then start next round or game over
    this.timeLeft = 5;
    this.timer = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.clearTimer();
        if (this.drawerQueue.length === 0 && this.currentRound >= this.totalRounds) {
          this.endGame();
        } else {
          this.startRound();
        }
      }
    }, 1000);
  }

  public endGame(): void {
    this.clearTimer();
    this.phase = 'GAME_OVER';

    const players = this.getActivePlayers().map(p => p.toJSON());
    const leaderboard = [...players].sort((a, b) => b.score - a.score);
    const winner = leaderboard[0];

    this.events.onGameOver(winner, leaderboard);
    this.events.onStateUpdate();
  }

  public handlePlayerDisconnect(playerId: string): void {
    // Remove from drawer queue if present
    this.drawerQueue = this.drawerQueue.filter(id => id !== playerId);

    // If active drawer disconnected during drawing, skip to next round
    if (this.currentDrawerId === playerId && (this.phase === 'DRAWING' || this.phase === 'WORD_SELECT')) {
      this.endRound();
      return;
    }

    // Check if remaining players can continue
    const active = this.getActivePlayers();
    if (active.length < 2 && this.phase !== 'LOBBY' && this.phase !== 'GAME_OVER') {
      this.phase = 'LOBBY';
      this.clearTimer();
      this.events.onStateUpdate();
    }
  }

  public getMaskedWord(): string {
    if (!this.currentWord) return '';
    return WordService.generateMask(this.currentWord, this.revealedIndices);
  }

  public getStatePayload(forPlayerId?: string): GameStatePayload {
    const isDrawer = forPlayerId && forPlayerId === this.currentDrawerId;
    const player = this.getPlayers().find(p => p.id === forPlayerId);
    const hasGuessed = player?.hasGuessed || false;

    // Word is visible only to drawer or players who have already guessed correctly, or when round is over / game over
    const showWord = isDrawer || hasGuessed || this.phase === 'ROUND_OVER' || this.phase === 'GAME_OVER';

    const scores: Record<string, number> = {};
    this.getPlayers().forEach(p => {
      scores[p.id] = p.score;
    });

    const drawer = this.getPlayers().find(p => p.id === this.currentDrawerId);

    return {
      phase: this.phase,
      round: this.currentRound,
      totalRounds: this.totalRounds,
      drawerId: this.currentDrawerId,
      drawerName: drawer ? drawer.name : null,
      word: showWord ? this.currentWord : null,
      hints: this.getMaskedWord(),
      wordLength: this.currentWord ? this.currentWord.length : 0,
      timeLeft: this.timeLeft,
      drawTime: this.drawTime,
      wordOptions: isDrawer && this.phase === 'WORD_SELECT' ? this.wordOptions : undefined,
      scores
    };
  }

  public getActivePlayers(): Player[] {
    return this.getPlayers().filter(p => p.connected && !p.isSpectator);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public cleanup(): void {
    this.clearTimer();
    this.drawingManager.reset();
  }
}
