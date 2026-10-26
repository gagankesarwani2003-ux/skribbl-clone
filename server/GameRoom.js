const { getRandomWords } = require("./words");

/**
 * Calculates Levenshtein distance between two strings to detect "close" guesses.
 */
function levenshteinDistance(a, b) {
  const matrix = [];
  const al = a.length;
  const bl = b.length;

  for (let i = 0; i <= al; i++) matrix[i] = [i];
  for (let j = 0; j <= bl; j++) matrix[0][j] = j;

  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[al][bl];
}

class GameRoom {
  constructor(code, io, options = {}) {
    this.code = code;
    this.io = io;
    this.players = new Map(); // socket.id -> Player
    this.turnOrder = []; // array of socket.id

    this.settings = {
      rounds: options.rounds || 3,
      drawTime: options.drawTime || 80,
      customWords: options.customWords || []
    };

    this.state = "LOBBY"; // LOBBY, SELECTING_WORD, DRAWING, ROUND_OVER, GAME_OVER
    this.currentRound = 0;
    this.drawerIndex = -1;
    this.currentDrawerId = null;

    this.currentWord = "";
    this.wordChoices = [];
    this.revealedIndices = new Set();
    this.strokes = []; // drawing action history

    this.timeLeft = 0;
    this.timerInterval = null;
    this.totalGuessers = 0;
    this.guessedCount = 0;
  }

  // --- Player Management ---

  addPlayer(socket, name, avatar) {
    const isFirstPlayer = this.players.size === 0;
    const player = {
      id: socket.id,
      name: (name || "Player").trim().slice(0, 18),
      avatar: avatar || [0, 0, 0, -1],
      score: 0,
      roundScore: 0,
      guessed: false,
      isHost: isFirstPlayer,
      connected: true
    };

    this.players.set(socket.id, player);
    if (!this.turnOrder.includes(socket.id)) {
      this.turnOrder.push(socket.id);
    }

    socket.join(this.code);

    // Notify room of player arrival
    this.broadcast("room:player_joined", {
      player,
      players: this.getPlayerList()
    });

    // Send full current room state to newly joined player
    socket.emit("room:state", this.getPublicState(socket.id));

    // Send stroke history if drawing is active
    if (this.strokes.length > 0) {
      socket.emit("draw:history", this.strokes);
    }

    return player;
  }

  removePlayer(socketId) {
    const player = this.players.get(socketId);
    if (!player) return;

    this.players.delete(socketId);
    this.turnOrder = this.turnOrder.filter(id => id !== socketId);

    // Assign new host if host left
    if (player.isHost && this.players.size > 0) {
      const newHost = this.players.values().next().value;
      newHost.isHost = true;
    }

    this.broadcast("room:player_left", {
      playerId: socketId,
      name: player.name,
      players: this.getPlayerList()
    });

    // If drawer leaves during active turn, advance turn immediately
    if (this.currentDrawerId === socketId && (this.state === "SELECTING_WORD" || this.state === "DRAWING")) {
      this.broadcast("chat:system", { message: `${player.name} (drawer) left the game! Skipping turn...` });
      this.endTurn();
      return;
    }

    // Check if not enough players to continue
    if (this.players.size < 2 && this.state !== "LOBBY") {
      this.resetToLobby("Not enough players remaining. Returning to lobby.");
      return;
    }

    // If remaining guessers have all guessed, finish turn early
    if (this.state === "DRAWING" && this.checkAllGuessed()) {
      this.endTurn();
    }
  }

  getPlayerList() {
    return Array.from(this.players.values()).sort((a, b) => b.score - a.score);
  }

  // --- Game State Flow ---

  startGame(socketId) {
    const player = this.players.get(socketId);
    if (!player || !player.isHost) {
      return { success: false, error: "Only the host can start the game." };
    }
    if (this.players.size < 2) {
      return { success: false, error: "At least 2 players are needed to start." };
    }
    if (this.state !== "LOBBY") {
      return { success: false, error: "Game is already in progress." };
    }

    // Reset scores
    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.guessed = false;
    }

    this.currentRound = 1;
    this.drawerIndex = -1;
    this.startNextTurn();
    return { success: true };
  }

  startNextTurn() {
    this.clearTimer();

    // Advance drawer index
    this.drawerIndex++;

    // Check if round complete
    if (this.drawerIndex >= this.turnOrder.length) {
      this.currentRound++;
      this.drawerIndex = 0;

      // Check if all rounds finished
      if (this.currentRound > this.settings.rounds) {
        this.triggerGameOver();
        return;
      }
    }

    this.currentDrawerId = this.turnOrder[this.drawerIndex];
    const drawer = this.players.get(this.currentDrawerId);

    // If drawer disconnected or missing, advance
    if (!drawer) {
      this.startNextTurn();
      return;
    }

    // Reset turn flags
    this.strokes = [];
    this.revealedIndices.clear();
    this.guessedCount = 0;
    this.totalGuessers = this.players.size - 1;

    for (const p of this.players.values()) {
      p.guessed = false;
      p.roundScore = 0;
    }

    // State: SELECTING_WORD
    this.state = "SELECTING_WORD";
    this.wordChoices = getRandomWords(3, this.settings.customWords);
    this.timeLeft = 15;

    // Send word choices exclusively to the drawer
    const drawerSocket = this.io.sockets.sockets.get(this.currentDrawerId);
    if (drawerSocket) {
      drawerSocket.emit("game:word_choices", this.wordChoices);
    }

    this.broadcast("game:turn_start", {
      round: this.currentRound,
      maxRounds: this.settings.rounds,
      drawerId: this.currentDrawerId,
      drawerName: drawer.name,
      timeLeft: this.timeLeft,
      players: this.getPlayerList()
    });

    this.startTimer(() => {
      // If drawer didn't pick word in time, auto-pick random
      if (this.state === "SELECTING_WORD") {
        const autoWord = this.wordChoices[Math.floor(Math.random() * this.wordChoices.length)];
        this.selectWord(this.currentDrawerId, autoWord);
      }
    });
  }

  selectWord(socketId, word) {
    if (socketId !== this.currentDrawerId || this.state !== "SELECTING_WORD") return;

    this.clearTimer();
    this.currentWord = (word || this.wordChoices[0]).toLowerCase().trim();
    this.state = "DRAWING";
    this.timeLeft = this.settings.drawTime;

    // Reveal non-alphanumeric chars immediately (spaces, dashes)
    for (let i = 0; i < this.currentWord.length; i++) {
      if (!/[a-z0-9]/i.test(this.currentWord[i])) {
        this.revealedIndices.add(i);
      }
    }

    // Inform drawer with full word
    const drawerSocket = this.io.sockets.sockets.get(this.currentDrawerId);
    if (drawerSocket) {
      drawerSocket.emit("game:draw_turn", {
        word: this.currentWord,
        timeLeft: this.timeLeft
      });
    }

    // Inform guessers with hidden hint pattern (e.g. "_ _ _ _")
    const hint = this.getHintPattern();
    for (const [id, socket] of this.io.sockets.sockets) {
      if (id !== this.currentDrawerId && this.players.has(id)) {
        socket.emit("game:guess_turn", {
          drawerName: this.players.get(this.currentDrawerId).name,
          hint,
          length: this.currentWord.length,
          timeLeft: this.timeLeft
        });
      }
    }

    this.broadcast("chat:system", {
      message: `${this.players.get(this.currentDrawerId).name} is drawing now!`
    });

    // Schedule progressive hints at 60% and 30% time
    const hint1Time = Math.floor(this.settings.drawTime * 0.6);
    const hint2Time = Math.floor(this.settings.drawTime * 0.3);

    this.startTimer(() => {
      this.endTurn("Time's up!");
    }, (remaining) => {
      if (remaining === hint1Time || remaining === hint2Time) {
        this.revealRandomLetter();
      }
    });
  }

  revealRandomLetter() {
    const unrevealed = [];
    for (let i = 0; i < this.currentWord.length; i++) {
      if (!this.revealedIndices.has(i)) {
        unrevealed.push(i);
      }
    }
    // Keep at least half the word hidden
    if (unrevealed.length > Math.ceil(this.currentWord.length / 2)) {
      const randomIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      this.revealedIndices.add(randomIdx);
      const hint = this.getHintPattern();

      // Broadcast hint update to guessers who haven't guessed yet
      for (const [id, socket] of this.io.sockets.sockets) {
        const player = this.players.get(id);
        if (player && id !== this.currentDrawerId && !player.guessed) {
          socket.emit("game:hint_update", { hint });
        }
      }
    }
  }

  getHintPattern() {
    return this.currentWord
      .split("")
      .map((char, i) => (this.revealedIndices.has(i) ? char : "_"))
      .join(" ");
  }

  // --- Guessing & Chat Handling ---

  handleChatMessage(socketId, text) {
    const player = this.players.get(socketId);
    if (!player) return;

    const trimmed = (text || "").trim().slice(0, 120);
    if (!trimmed) return;

    // Check if player is guessing during active drawing state
    if (this.state === "DRAWING") {
      // Drawer cannot chat or guess
      if (socketId === this.currentDrawerId) {
        return;
      }

      // If player already guessed, their messages only show to other players who guessed
      if (player.guessed) {
        this.broadcastToGuessed({
          type: "chat",
          sender: player.name,
          text: trimmed,
          isGuessed: true
        });
        return;
      }

      const normalizedGuess = trimmed.toLowerCase();
      if (normalizedGuess === this.currentWord) {
        this.handleCorrectGuess(player);
        return;
      }

      // Check if guess is close (Levenshtein distance = 1)
      if (levenshteinDistance(normalizedGuess, this.currentWord) === 1) {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit("chat:close", { guess: trimmed });
        }
      }
    }

    // Normal public chat message
    this.broadcast("chat:message", {
      sender: player.name,
      text: trimmed,
      color: null
    });
  }

  handleCorrectGuess(player) {
    player.guessed = true;
    this.guessedCount++;

    // Calculate score: fast guess bonus (up to 500 points)
    const timeFactor = this.timeLeft / this.settings.drawTime;
    const guessPoints = Math.round(100 + 400 * timeFactor);
    player.roundScore = guessPoints;
    player.score += guessPoints;

    // Award drawer bonus points
    const drawer = this.players.get(this.currentDrawerId);
    if (drawer) {
      const drawerBonus = Math.round(350 / Math.max(1, this.totalGuessers));
      drawer.roundScore = (drawer.roundScore || 0) + drawerBonus;
      drawer.score += drawerBonus;
    }

    // Inform the guesser privately with the secret word
    const playerSocket = this.io.sockets.sockets.get(player.id);
    if (playerSocket) {
      playerSocket.emit("game:you_guessed", {
        word: this.currentWord,
        points: guessPoints
      });
    }

    // Broadcast announcement
    this.broadcast("game:player_guessed", {
      playerId: player.id,
      name: player.name,
      points: guessPoints,
      players: this.getPlayerList()
    });

    // Check if everyone has guessed
    if (this.checkAllGuessed()) {
      this.broadcast("chat:system", { message: "Everyone guessed the word!" });
      this.endTurn();
    }
  }

  checkAllGuessed() {
    let unguessers = 0;
    for (const [id, p] of this.players) {
      if (id !== this.currentDrawerId && !p.guessed) {
        unguessers++;
      }
    }
    return unguessers === 0;
  }

  broadcastToGuessed(payload) {
    for (const [id, p] of this.players) {
      if (p.guessed || id === this.currentDrawerId) {
        const socket = this.io.sockets.sockets.get(id);
        if (socket) socket.emit("chat:message", payload);
      }
    }
  }

  // --- End of Turn & Game Over ---

  endTurn(reason = "") {
    this.clearTimer();
    this.state = "ROUND_OVER";
    this.timeLeft = 5;

    this.broadcast("game:round_end", {
      word: this.currentWord,
      reason,
      players: this.getPlayerList(),
      timeLeft: this.timeLeft
    });

    this.startTimer(() => {
      this.startNextTurn();
    });
  }

  triggerGameOver() {
    this.clearTimer();
    this.state = "GAME_OVER";

    const podium = this.getPlayerList().slice(0, 3);
    this.broadcast("game:over", {
      podium,
      players: this.getPlayerList()
    });
  }

  resetToLobby(reason = "") {
    this.clearTimer();
    this.state = "LOBBY";
    this.currentRound = 0;
    this.currentDrawerId = null;
    this.strokes = [];

    for (const p of this.players.values()) {
      p.score = 0;
      p.roundScore = 0;
      p.guessed = false;
    }

    this.broadcast("game:reset_lobby", {
      reason,
      players: this.getPlayerList()
    });
  }

  // --- Real-time Drawing Events ---

  handleDrawAction(socketId, action) {
    if (socketId !== this.currentDrawerId || this.state !== "DRAWING") return;

    if (action.type === "clear") {
      this.strokes = [];
    } else if (action.type === "undo") {
      this.strokes.pop();
    } else {
      this.strokes.push(action);
    }

    // Broadcast stroke to all other players in the room
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.to(this.code).emit("draw:action", action);
    }
  }

  // --- Timers & State Helpers ---

  startTimer(onComplete, onTick) {
    this.clearTimer();
    this.timerInterval = setInterval(() => {
      this.timeLeft--;
      this.broadcast("game:timer", { timeLeft: this.timeLeft });

      if (onTick) onTick(this.timeLeft);

      if (this.timeLeft <= 0) {
        this.clearTimer();
        if (onComplete) onComplete();
      }
    }, 1000);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  broadcast(event, data) {
    this.io.to(this.code).emit(event, data);
  }

  getPublicState(socketId) {
    const isDrawer = socketId === this.currentDrawerId;
    const player = this.players.get(socketId);
    const hasGuessed = player ? player.guessed : false;

    return {
      code: this.code,
      state: this.state,
      round: this.currentRound,
      maxRounds: this.settings.rounds,
      currentDrawerId: this.currentDrawerId,
      drawerName: this.currentDrawerId && this.players.get(this.currentDrawerId) ? this.players.get(this.currentDrawerId).name : null,
      word: (isDrawer || hasGuessed || this.state === "ROUND_OVER" || this.state === "GAME_OVER") ? this.currentWord : null,
      hint: !isDrawer ? this.getHintPattern() : null,
      timeLeft: this.timeLeft,
      players: this.getPlayerList()
    };
  }
}

module.exports = GameRoom;
