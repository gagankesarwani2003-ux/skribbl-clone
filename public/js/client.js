/**
 * Skribbl.io Authentic Client Application Controller
 */

// Global App State
const state = {
  socket: null,
  canvas: null,
  me: null,
  roomCode: null,
  isHost: false,
  isDrawer: false,
  hasGuessed: false,
  // [colorIndex (0-27), eyesIndex (0-56), mouthIndex (0-50), specialIndex (-1 or 0-99)]
  avatar: [0, 0, 0, -1]
};

const TOTAL_COLORS = 28;
const TOTAL_EYES = 57;
const TOTAL_MOUTHS = 51;

const PALETTE_COLORS = [
  "#ffffff", "#c1c1c1", "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#854d0e", "#000000",
  "#4b5563", "#7f1d1d", "#7c2d12", "#713f12", "#14532d", "#164e63",
  "#1e3a8a", "#4c1d95", "#831843", "#451a03", "#78716c", "#172554"
];

// Initialize DOM and Socket
document.addEventListener("DOMContentLoaded", () => {
  loadSavedProfile();
  initLogoAvatarRow();
  initAvatarCustomizer();
  initTutorialCarousel();
  checkUrlForRoomCode();
  initColorPalette();
  initDrawingTools();
  initCanvasController();
  bindSocketEvents();
  bindUIEvents();
});

// --- Profile & Avatar Management ---

function loadSavedProfile() {
  const savedName = localStorage.getItem("skribbl_name");
  if (savedName) {
    document.getElementById("input-name").value = savedName;
  }
  const savedAvatar = localStorage.getItem("skribbl_avatar_atlas");
  if (savedAvatar) {
    try {
      state.avatar = JSON.parse(savedAvatar);
    } catch (e) {
      randomizeAvatar();
    }
  } else {
    randomizeAvatar();
  }
  renderAvatarPreview();
}

function saveProfile(name) {
  localStorage.setItem("skribbl_name", name);
  localStorage.setItem("skribbl_avatar_atlas", JSON.stringify(state.avatar));
}

function randomizeAvatar() {
  state.avatar = [
    Math.floor(Math.random() * TOTAL_COLORS),
    Math.floor(Math.random() * TOTAL_EYES),
    Math.floor(Math.random() * TOTAL_MOUTHS),
    -1
  ];
  renderAvatarPreview();
}

function renderAvatarHtml(avatar, size = 96, extraClass = "") {
  const av = Array.isArray(avatar) ? avatar : [0, 0, 0, -1];
  const color = (av[0] || 0) % TOTAL_COLORS;
  const eyes = (av[1] || 0) % TOTAL_EYES;
  const mouth = (av[2] || 0) % TOTAL_MOUTHS;
  const special = av[3] !== undefined ? av[3] : -1;

  const colorX = -(color % 10) * 100;
  const colorY = -Math.floor(color / 10) * 100;

  const eyesX = -(eyes % 10) * 100;
  const eyesY = -Math.floor(eyes / 10) * 100;

  const mouthX = -(mouth % 10) * 100;
  const mouthY = -Math.floor(mouth / 10) * 100;

  let specialHtml = "";
  if (special >= 0) {
    const spX = -(special % 10) * 100;
    const spY = -Math.floor(special / 10) * 100;
    specialHtml = `<div class="special" style="background-position: ${spX}% ${spY}%;"></div>`;
  }

  return `
    <div class="avatar ${extraClass}" style="width:${size}px; height:${size}px;">
      <div class="color" style="background-position: ${colorX}% ${colorY}%;"></div>
      <div class="eyes" style="background-position: ${eyesX}% ${eyesY}%;"></div>
      <div class="mouth" style="background-position: ${mouthX}% ${mouthY}%;"></div>
      ${specialHtml}
    </div>
  `;
}

function renderAvatarPreview() {
  const container = document.getElementById("avatar-preview-box");
  container.innerHTML = renderAvatarHtml(state.avatar, 96);
}

function initLogoAvatarRow() {
  const row = document.getElementById("logo-avatar-row");
  row.innerHTML = "";

  // The 8 classic colorful blobs under the logo
  const bannerAvatars = [
    [0, 0, 0, -1],   // Red
    [1, 1, 1, -1],   // Orange
    [2, 2, 2, -1],   // Yellow
    [3, 3, 3, -1],   // Green
    [4, 4, 4, -1],   // Cyan
    [5, 5, 5, -1],   // Blue
    [6, 6, 6, -1],   // Purple (King with crown)
    [7, 7, 7, -1]    // Pink
  ];

  bannerAvatars.forEach((av, idx) => {
    const wrap = document.createElement("div");
    const isCrown = (idx === 6);
    wrap.innerHTML = renderAvatarHtml(av, 48, isCrown ? "has-crown" : "");
    wrap.title = "Click to wear this look!";
    wrap.addEventListener("click", () => {
      state.avatar = [...av];
      renderAvatarPreview();
      window.soundFx.playPop();
    });
    row.appendChild(wrap.firstElementChild);
  });
}

function initAvatarCustomizer() {
  // Color arrows
  document.getElementById("btn-prev-color").addEventListener("click", () => {
    state.avatar[0] = (state.avatar[0] - 1 + TOTAL_COLORS) % TOTAL_COLORS;
    renderAvatarPreview();
  });
  document.getElementById("btn-next-color").addEventListener("click", () => {
    state.avatar[0] = (state.avatar[0] + 1) % TOTAL_COLORS;
    renderAvatarPreview();
  });

  // Eyes arrows
  document.getElementById("btn-prev-eyes").addEventListener("click", () => {
    state.avatar[1] = (state.avatar[1] - 1 + TOTAL_EYES) % TOTAL_EYES;
    renderAvatarPreview();
  });
  document.getElementById("btn-next-eyes").addEventListener("click", () => {
    state.avatar[1] = (state.avatar[1] + 1) % TOTAL_EYES;
    renderAvatarPreview();
  });

  // Mouth arrows
  document.getElementById("btn-prev-mouth").addEventListener("click", () => {
    state.avatar[2] = (state.avatar[2] - 1 + TOTAL_MOUTHS) % TOTAL_MOUTHS;
    renderAvatarPreview();
  });
  document.getElementById("btn-next-mouth").addEventListener("click", () => {
    state.avatar[2] = (state.avatar[2] + 1) % TOTAL_MOUTHS;
    renderAvatarPreview();
  });

  // Randomize button (Dice)
  document.getElementById("btn-randomize-avatar").addEventListener("click", () => {
    randomizeAvatar();
    window.soundFx.playPop();
  });
}

// Tutorial Step Carousel
function initTutorialCarousel() {
  const steps = [
    { img: "/img/tutorial/step1.gif", desc: "When it's your turn, choose a word you want to draw!" },
    { img: "/img/tutorial/step2.gif", desc: "Try to draw your chosen word! No spelling!" },
    { img: "/img/tutorial/step3.gif", desc: "Let other players try to guess your drawn word!" },
    { img: "/img/tutorial/step4.gif", desc: "When it's not your turn, try to guess what other players are drawing!" },
    { img: "/img/tutorial/step5.gif", desc: "Score the most points and be crowned the winner at the end!" }
  ];

  let currentStep = 0;
  const imgEl = document.getElementById("tutorial-img");
  const descEl = document.getElementById("tutorial-desc");

  setInterval(() => {
    currentStep = (currentStep + 1) % steps.length;
    if (imgEl && descEl) {
      imgEl.src = steps[currentStep].img;
      descEl.textContent = steps[currentStep].desc;
    }
  }, 4000);
}

function checkUrlForRoomCode() {
  const urlParams = new URLSearchParams(window.location.search);
  const room = urlParams.get("room");
  if (room) {
    document.getElementById("input-room-code").value = room.toUpperCase();
    document.getElementById("modal-create-room").classList.remove("hidden");
  }
}

// --- Canvas & Palette Setup ---

function initColorPalette() {
  const paletteContainer = document.getElementById("color-palette");
  paletteContainer.innerHTML = "";

  PALETTE_COLORS.forEach((color, idx) => {
    const swatch = document.createElement("button");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = color;
    swatch.setAttribute("data-color", color);
    if (idx === 11) swatch.classList.add("active"); // default black

    swatch.addEventListener("click", () => {
      document.querySelectorAll(".color-swatch").forEach(s => s.classList.remove("active"));
      swatch.classList.add("active");
      state.canvas.setColor(color);
      state.canvas.setTool("brush");
      document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
      document.getElementById("tool-brush").classList.add("active");
    });

    paletteContainer.appendChild(swatch);
  });
}

function initDrawingTools() {
  const sizes = [
    { id: "size-s", size: 3 },
    { id: "size-m", size: 7 },
    { id: "size-l", size: 14 },
    { id: "size-xl", size: 28 }
  ];

  sizes.forEach(({ id, size }) => {
    const btn = document.getElementById(id);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".brush-size-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      state.canvas.setBrushSize(size);
    });
  });

  const toolBrush = document.getElementById("tool-brush");
  const toolEraser = document.getElementById("tool-eraser");
  const toolFill = document.getElementById("tool-fill");
  const toolClear = document.getElementById("tool-clear");
  const toolUndo = document.getElementById("tool-undo");

  toolBrush.addEventListener("click", () => {
    setActiveTool(toolBrush);
    state.canvas.setTool("brush");
  });

  toolEraser.addEventListener("click", () => {
    setActiveTool(toolEraser);
    state.canvas.setTool("eraser");
  });

  toolFill.addEventListener("click", () => {
    setActiveTool(toolFill);
    state.canvas.setTool("fill");
  });

  toolClear.addEventListener("click", () => {
    if (confirm("Clear the entire canvas?")) {
      state.canvas.clearCanvas(true);
    }
  });

  toolUndo.addEventListener("click", () => {
    state.canvas.undo(true);
  });
}

function setActiveTool(activeBtn) {
  document.querySelectorAll(".tool-btn").forEach(b => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

function initCanvasController() {
  const canvasEl = document.getElementById("game-canvas");
  state.canvas = new PaintCanvas(canvasEl, (action) => {
    if (state.socket && state.isDrawer) {
      state.socket.emit("draw:action", action);
    }
  });
}

// --- Socket.io Handlers ---

function bindSocketEvents() {
  state.socket = io();

  state.socket.on("connect", () => {
    console.log("[Socket] Connected:", state.socket.id);
  });

  state.socket.on("room:state", (roomData) => {
    state.roomCode = roomData.code;
    updateRoomHUD(roomData);
    renderPlayerList(roomData.players);

    if (roomData.state === "LOBBY") {
      showLobbyWaitingOverlay();
    } else if (roomData.state === "DRAWING") {
      if (roomData.currentDrawerId === state.socket.id) {
        setDrawerMode(roomData.word);
      } else {
        setGuesserMode(roomData.drawerName, roomData.hint);
      }
    }
  });

  state.socket.on("room:player_joined", ({ player, players }) => {
    renderPlayerList(players);
    addSystemChatMessage(`${player.name} joined the room!`);
    window.soundFx.playPop();
  });

  state.socket.on("room:player_left", ({ name, players }) => {
    renderPlayerList(players);
    addSystemChatMessage(`${name} left the room.`);
  });

  state.socket.on("game:turn_start", (data) => {
    state.hasGuessed = false;
    state.isDrawer = (data.drawerId === state.socket.id);
    state.canvas.clearCanvas(false);
    state.canvas.setCanDraw(false);

    hideAllOverlays();
    updateRoundIndicator(data.round, data.maxRounds);
    renderPlayerList(data.players);

    if (state.isDrawer) {
      document.getElementById("word-display").textContent = "Choosing a word...";
    } else {
      document.getElementById("word-display").textContent = `${data.drawerName} is choosing a word...`;
      addSystemChatMessage(`${data.drawerName} is choosing a word!`);
    }
  });

  state.socket.on("game:word_choices", (words) => {
    showWordChoiceModal(words);
  });

  state.socket.on("game:draw_turn", (data) => {
    hideAllOverlays();
    setDrawerMode(data.word);
    addSystemChatMessage(`It's your turn to draw! Word: "${data.word}"`);
  });

  state.socket.on("game:guess_turn", (data) => {
    hideAllOverlays();
    setGuesserMode(data.drawerName, data.hint);
  });

  state.socket.on("game:hint_update", ({ hint }) => {
    if (!state.isDrawer && !state.hasGuessed) {
      document.getElementById("word-display").textContent = hint;
    }
  });

  state.socket.on("draw:action", (action) => {
    if (!state.isDrawer) {
      state.canvas.applyAction(action);
    }
  });

  state.socket.on("draw:history", (history) => {
    if (!state.isDrawer) {
      state.canvas.loadHistory(history);
    }
  });

  state.socket.on("chat:message", (msg) => {
    appendChatMessage(msg.sender, msg.text, msg.color, msg.isGuessed);
  });

  state.socket.on("chat:system", ({ message }) => {
    addSystemChatMessage(message);
  });

  state.socket.on("chat:close", ({ guess }) => {
    addCloseGuessAlert(`'${guess}' is close!`);
    window.soundFx.playClose();
  });

  state.socket.on("game:player_guessed", ({ playerId, name, points, players }) => {
    renderPlayerList(players);
    addCorrectGuessNotice(`${name} guessed the word! (+${points} pts)`);
    if (playerId === state.socket.id) {
      window.soundFx.playCorrect();
    } else {
      window.soundFx.playPop();
    }
  });

  state.socket.on("game:you_guessed", ({ word, points }) => {
    state.hasGuessed = true;
    document.getElementById("word-display").textContent = word.toUpperCase();
    document.getElementById("word-display").classList.add("guessed-word");
    addCorrectGuessNotice(`You guessed the word! (+${points} pts)`);
    window.soundFx.playCorrect();
  });

  state.socket.on("game:timer", ({ timeLeft }) => {
    updateTimer(timeLeft);
    if (timeLeft <= 5 && timeLeft > 0) {
      window.soundFx.playTick();
    }
  });

  state.socket.on("game:round_end", (data) => {
    showRoundEndOverlay(data.word, data.reason);
    renderPlayerList(data.players);
    window.soundFx.playRoundEnd();
  });

  state.socket.on("game:over", (data) => {
    showGameOverModal(data.podium);
    renderPlayerList(data.players);
    window.soundFx.playGameOver();
  });

  state.socket.on("game:reset_lobby", ({ reason, players }) => {
    hideAllOverlays();
    showLobbyWaitingOverlay();
    renderPlayerList(players);
    if (reason) addSystemChatMessage(reason);
  });
}

// --- UI Interaction Bindings ---

function bindUIEvents() {
  const nameInput = document.getElementById("input-name");

  // Play Now (Quick Play)
  document.getElementById("btn-quick-play").addEventListener("click", () => {
    const name = nameInput.value.trim() || "Player" + Math.floor(Math.random() * 900 + 100);
    saveProfile(name);

    state.socket.emit("room:quick_play", { name, avatar: state.avatar }, (res) => {
      if (res && res.success) {
        enterGameRoom(res.room.code, res.player);
      } else {
        alert("Failed to join game: " + (res ? res.error : "Unknown error"));
      }
    });
  });

  // Open Create Room Modal
  document.getElementById("btn-create-room-modal").addEventListener("click", () => {
    document.getElementById("modal-create-room").classList.remove("hidden");
  });

  // Confirm Create Room
  document.getElementById("btn-confirm-create-room").addEventListener("click", () => {
    const name = nameInput.value.trim() || "Host" + Math.floor(Math.random() * 900 + 100);
    saveProfile(name);

    const rounds = parseInt(document.getElementById("select-rounds").value, 10);
    const drawTime = parseInt(document.getElementById("select-draw-time").value, 10);

    state.socket.emit("room:create", {
      name,
      avatar: state.avatar,
      settings: { rounds, drawTime }
    }, (res) => {
      if (res && res.success) {
        document.getElementById("modal-create-room").classList.add("hidden");
        enterGameRoom(res.roomCode, res.player);
      } else {
        alert("Error creating room: " + (res ? res.error : ""));
      }
    });
  });

  // Join by Room Code
  document.getElementById("btn-join-room").addEventListener("click", () => {
    const name = nameInput.value.trim() || "Player" + Math.floor(Math.random() * 900 + 100);
    saveProfile(name);
    const code = document.getElementById("input-room-code").value.trim().toUpperCase();

    if (!code) {
      alert("Please enter a 6-character room code.");
      return;
    }

    state.socket.emit("room:join", {
      name,
      avatar: state.avatar,
      roomCode: code
    }, (res) => {
      if (res && res.success) {
        enterGameRoom(res.room.code, res.player);
      } else {
        alert("Could not join room: " + (res ? res.error : "Room not found"));
      }
    });
  });

  // Close modals
  document.querySelectorAll(".btn-close-modal").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest(".modal-backdrop").classList.add("hidden");
    });
  });

  // Copy Invite Link Button
  document.getElementById("btn-copy-invite").addEventListener("click", () => {
    const url = `${window.location.origin}/?room=${state.roomCode}`;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById("btn-copy-invite");
      btn.textContent = "Link Copied!";
      btn.classList.add("copied");
      setTimeout(() => {
        btn.textContent = "Copy Invite";
        btn.classList.remove("copied");
      }, 2000);
    });
  });

  // Sound Toggle Button
  document.getElementById("btn-toggle-sound").addEventListener("click", () => {
    const enabled = window.soundFx.toggle();
    const btn = document.getElementById("btn-toggle-sound");
    btn.innerHTML = enabled ? "🔊 Sound: On" : "🔇 Sound: Off";
  });

  // Chat Submission Form
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");

  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (text && state.socket) {
      state.socket.emit("chat:message", text);
      chatInput.value = "";
    }
  });

  // Host Start Game Button
  document.getElementById("btn-host-start-game").addEventListener("click", () => {
    state.socket.emit("game:start", (res) => {
      if (!res.success) {
        alert(res.error);
      }
    });
  });

  // Host Play Again Button
  document.getElementById("btn-play-again").addEventListener("click", () => {
    state.socket.emit("game:play_again");
  });
}

function enterGameRoom(roomCode, player) {
  state.roomCode = roomCode;
  state.me = player;
  state.isHost = player.isHost;

  document.getElementById("home").classList.add("hidden");
  document.getElementById("view-game").classList.remove("hidden");
  document.getElementById("display-room-code").textContent = roomCode;

  const newUrl = `${window.location.pathname}?room=${roomCode}`;
  window.history.pushState({ room: roomCode }, "", newUrl);

  setTimeout(() => {
    if (state.canvas) {
      state.canvas.initCanvas();
    }
  }, 100);
}

// --- HUD & Mode Toggles ---

function updateRoomHUD(roomData) {
  document.getElementById("display-room-code").textContent = roomData.code;
  updateRoundIndicator(roomData.round || 1, roomData.maxRounds || 3);
  updateTimer(roomData.timeLeft || 0);

  const me = roomData.players.find(p => p.id === state.socket.id);
  if (me) {
    state.isHost = me.isHost;
  }
}

function updateRoundIndicator(round, maxRounds) {
  document.getElementById("display-round").textContent = `Round ${round || 1} of ${maxRounds || 3}`;
}

function updateTimer(seconds) {
  const timerEl = document.getElementById("display-timer");
  timerEl.textContent = `${seconds}s`;
  if (seconds <= 10) {
    timerEl.classList.add("urgent");
  } else {
    timerEl.classList.remove("urgent");
  }
}

function setDrawerMode(word) {
  state.isDrawer = true;
  state.canvas.setCanDraw(true);
  document.getElementById("drawing-toolbar").classList.remove("hidden");
  const wordDisplay = document.getElementById("word-display");
  wordDisplay.textContent = `DRAW: ${word.toUpperCase()}`;
  wordDisplay.classList.remove("guessed-word");

  const chatInput = document.getElementById("chat-input");
  chatInput.disabled = true;
  chatInput.placeholder = "You are drawing! Chat is disabled.";
}

function setGuesserMode(drawerName, hint) {
  state.isDrawer = false;
  state.canvas.setCanDraw(false);
  document.getElementById("drawing-toolbar").classList.add("hidden");
  const wordDisplay = document.getElementById("word-display");
  wordDisplay.textContent = hint;
  wordDisplay.classList.remove("guessed-word");

  const chatInput = document.getElementById("chat-input");
  chatInput.disabled = false;
  chatInput.placeholder = "Type your guess here...";
  chatInput.focus();
}

// --- Overlays & Modals ---

function hideAllOverlays() {
  document.getElementById("overlay-word-choice").classList.add("hidden");
  document.getElementById("overlay-waiting-lobby").classList.add("hidden");
  document.getElementById("overlay-round-end").classList.add("hidden");
  document.getElementById("overlay-game-over").classList.add("hidden");
}

function showLobbyWaitingOverlay() {
  hideAllOverlays();
  const overlay = document.getElementById("overlay-waiting-lobby");
  overlay.classList.remove("hidden");

  const startBtn = document.getElementById("btn-host-start-game");
  const waitMsg = document.getElementById("waiting-host-msg");

  if (state.isHost) {
    startBtn.classList.remove("hidden");
    waitMsg.classList.add("hidden");
  } else {
    startBtn.classList.add("hidden");
    waitMsg.classList.remove("hidden");
  }
}

function showWordChoiceModal(words) {
  hideAllOverlays();
  const overlay = document.getElementById("overlay-word-choice");
  const container = document.getElementById("word-options-container");
  container.innerHTML = "";

  words.forEach((word) => {
    const btn = document.createElement("button");
    btn.className = "btn-word-choice";
    btn.textContent = word;
    btn.addEventListener("click", () => {
      state.socket.emit("game:select_word", word);
      overlay.classList.add("hidden");
    });
    container.appendChild(btn);
  });

  overlay.classList.remove("hidden");
}

function showRoundEndOverlay(word, reason) {
  hideAllOverlays();
  const overlay = document.getElementById("overlay-round-end");
  document.getElementById("round-end-word").textContent = word ? word.toUpperCase() : "";
  document.getElementById("round-end-reason").textContent = reason || "";
  overlay.classList.remove("hidden");
}

function showGameOverModal(podium) {
  hideAllOverlays();
  const overlay = document.getElementById("overlay-game-over");
  const container = document.getElementById("podium-container");
  container.innerHTML = "";

  const medals = ["🥇 1st Place", "🥈 2nd Place", "🥉 3rd Place"];
  podium.forEach((player, idx) => {
    const card = document.createElement("div");
    card.className = `podium-card rank-${idx + 1}`;
    card.innerHTML = `
      <div class="podium-medal">${medals[idx] || "#" + (idx + 1)}</div>
      <div class="podium-avatar">${renderAvatarHtml(player.avatar, 56)}</div>
      <div class="podium-name">${escapeHtml(player.name)}</div>
      <div class="podium-score">${player.score} pts</div>
    `;
    container.appendChild(card);
  });

  const playAgainBtn = document.getElementById("btn-play-again");
  if (state.isHost) {
    playAgainBtn.classList.remove("hidden");
  } else {
    playAgainBtn.classList.add("hidden");
  }

  overlay.classList.remove("hidden");
}

// --- Player List Rendering ---

function renderPlayerList(players) {
  const container = document.getElementById("player-list");
  container.innerHTML = "";

  const sorted = [...(players || [])].sort((a, b) => b.score - a.score);

  sorted.forEach((player, index) => {
    const item = document.createElement("div");
    item.className = "player-item";
    if (player.id === state.socket.id) item.classList.add("is-me");
    if (player.guessed) item.classList.add("has-guessed");

    const isCurrentDrawer = (player.id === state.currentDrawerId);

    item.innerHTML = `
      <div class="player-rank">#${index + 1}</div>
      <div class="player-avatar">${renderAvatarHtml(player.avatar, 44)}</div>
      <div class="player-details">
        <div class="player-name">
          ${escapeHtml(player.name)}
          ${player.isHost ? '<span class="icon-host" title="Host">👑</span>' : ""}
          ${isCurrentDrawer ? '<span class="icon-drawing" title="Drawing">✏️</span>' : ""}
          ${player.guessed ? '<span class="icon-guessed" title="Guessed!">✅</span>' : ""}
        </div>
        <div class="player-score">${player.score} points</div>
      </div>
    `;
    container.appendChild(item);
  });
}

// --- Chat Box Helpers ---

function appendChatMessage(sender, text, color, isGuessed = false) {
  const chatStream = document.getElementById("chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-item";
  if (isGuessed) msgEl.classList.add("chat-guessed-only");

  msgEl.innerHTML = `
    <span class="chat-sender" style="color: ${color || '#38bdf8'}">${escapeHtml(sender)}:</span>
    <span class="chat-text">${escapeHtml(text)}</span>
  `;

  chatStream.appendChild(msgEl);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function addSystemChatMessage(message) {
  const chatStream = document.getElementById("chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-item chat-system";
  msgEl.textContent = `📢 ${message}`;
  chatStream.appendChild(msgEl);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function addCorrectGuessNotice(message) {
  const chatStream = document.getElementById("chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-item chat-correct";
  msgEl.textContent = `🎉 ${message}`;
  chatStream.appendChild(msgEl);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function addCloseGuessAlert(message) {
  const chatStream = document.getElementById("chat-messages");
  const msgEl = document.createElement("div");
  msgEl.className = "chat-item chat-close";
  msgEl.textContent = `⚠️ ${message}`;
  chatStream.appendChild(msgEl);
  chatStream.scrollTop = chatStream.scrollHeight;
}

function escapeHtml(str) {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
