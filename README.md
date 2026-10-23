# 🎨 Skribbl.io Clone - Full-Stack Multiplayer Drawing & Guessing Game

A modern, full-stack, real-time multiplayer drawing and guessing game inspired by [skribbl.io](https://skribbl.io). Built with **React**, **TypeScript**, **HTML5 Canvas**, **Node.js (Express)**, and **Socket.IO**.

---

## 🌟 Key Features

### 1. Multiplayer Rooms & Lobby
- **Room Creation**: Host custom rooms with customizable settings:
  - Max players (2–20)
  - Rounds (2–10)
  - Draw time (15–240 seconds)
  - Word choices (1–5 words per round)
  - Hint count (0–5 letters revealed over time)
  - Categorized word banks (Animals, Food, Everyday Objects, Actions, All)
  - Custom words list support (comma-separated words added by host)
  - Public or Private visibility toggle
- **Join by Code or Link**: One-click invite link sharing (`https://domain/?room=ROOMCODE`) and 6-letter room codes.
- **Quick Play & Public Room Browser**: Matchmaking that automatically pairs players with active public lobbies or lets them browse open rooms.
- **Custom Avatars**: Playful interactive avatar creator with SVG face customizers (eye shapes, mouth expressions, custom colors, and randomizer).
- **Host Moderation**: Host has kick capabilities to moderate room participants.

### 2. Turn-Based Game Flow
- **Turn Order Queue**: Each player in the room takes turns as the designated drawer while others guess.
- **Word Selection**: The active drawer is presented with multiple word choices (with a 15-second selection timer before auto-choosing).
- **Real-Time Word Hints**: Guessers see masked blank slots (e.g. `_ _ _ _ _ (5)`). Letters are progressively revealed over time at calculated intervals.
- **Dynamic Scoring System**:
  - Guessers earn up to 500+ points scaled by how fast they guessed (percentage of draw time remaining).
  - First player to guess receives an additional first-place bonus (+50 pts).
  - The drawer is rewarded with points whenever players successfully guess their drawing!
- **Close Guess Detection**: Levenshtein distance calculations trigger private `'[word]' is very close!` notifications when a guesser is off by 1–2 letters.
- **Spoiler-Free Guesser Chat**: Once a player guesses correctly, their chat messages are routed to a private channel for other guessed players and the drawer, preventing spoilers for unguessed players.
- **Round Recap & Podium Celebration**:
  - Round end overlays showing the revealed word and scores.
  - Final game-over podium celebrating 1st, 2nd, and 3rd place with celebratory confetti cannon fireworks and fanfare.

### 3. Drawing Canvas Engine
- **HTML5 Canvas API**: Zero heavy canvas framework dependencies, lightweight and performant.
- **Normalized Coordinate System**: All coordinates are mapped to a `[0..1]` normalized coordinate plane before being transmitted over WebSockets. High-DPI screens, mobile phones, and ultra-wide desktop monitors render identical stroke proportions and line thickness!
- **Smooth Quadratic Bezier Splines**: Continuous stroke points are interpolated with Bezier curves to eliminate jagged angles.
- **Drawing Tools**:
  - Brush / Pen with variable sizes (Thin, Medium, Thick, Huge)
  - Color Palette + HTML5 Color Picker
  - Flood Fill / Bucket Tool (BFS scanline flood-fill algorithm)
  - Eraser Tool
  - Undo Last Stroke (`draw_undo`)
  - Clear Canvas (`canvas_clear`)
- **Stroke History & Catch-Up**: Canvas history is tracked on the server and transmitted to spectators or newly connected players so their canvases are synchronized immediately.

### 4. Audio Effects (Web Audio API)
- Zero external audio files required! Synthesized real-time sound effects:
  - Correct guess chime (harmonic bell)
  - Clock ticking warning (woodblock sound for final 5 seconds)
  - Round start chime
  - Round resolution chord
  - Winner victory fanfare
  - Interactive UI clicks & pops
  - Sound mute / unmute toggle with persistent local storage.

---

## 🏛️ Architecture & OOP Design

The backend is structured strictly using **Object-Oriented Programming (OOP)** principles:

```
skribbl-clone/
├── server/
│   ├── src/
│   │   ├── Player.ts          # Encapsulates player state, scores, avatar & roles
│   │   ├── DrawingManager.ts  # In-memory canvas stroke history, undo, and clear
│   │   ├── WordService.ts     # Categorized dictionary, word picker, hints & fuzzy match
│   │   ├── Game.ts            # State machine (LOBBY, WORD_SELECT, DRAWING, ROUND_OVER, GAME_OVER)
│   │   ├── Room.ts            # Manages participants, socket rooms, chat, and event broadcasting
│   │   ├── RoomManager.ts     # Manages active rooms, code indexing, cleanup, & public listing
│   │   ├── types.ts           # Shared TypeScript interfaces & event payloads
│   │   └── index.ts           # Express server, Socket.IO event listeners & static file server
│   ├── package.json
│   └── tsconfig.json
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Avatar.tsx           # Scalable SVG avatar renderer with facial expressions
│   │   │   ├── AvatarPicker.tsx     # Color, eye, and mouth customizer
│   │   │   ├── Canvas.tsx           # HTML5 drawing canvas with flood fill & toolbars
│   │   │   ├── Chat.tsx             # Real-time guess feed with spoiler protection
│   │   │   ├── GameOverModal.tsx    # Confetti celebration & podium leaderboard
│   │   │   ├── GameScreen.tsx       # Main game arena container
│   │   │   ├── Home.tsx             # Landing hero, matchmaking & room browser
│   │   │   ├── Leaderboard.tsx      # In-game score rankings with medals
│   │   │   ├── Lobby.tsx            # Host settings & waiting room
│   │   │   └── WordSelectModal.tsx  # Word choice dialog for drawer
│   │   ├── services/
│   │   │   ├── audio.ts             # Web Audio API sound synthesizer
│   │   │   └── socket.ts            # Socket.IO client manager
│   │   ├── types/index.ts           # Client TypeScript types
│   │   ├── App.tsx                  # Root state orchestration
│   │   ├── main.tsx
│   │   └── index.css                # Tailwind CSS & custom styles
│   ├── package.json
│   └── vite.config.ts
├── package.json
└── README.md
```

### WebSocket Event Protocol

| Event Name | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `create_room` | Client ➔ Server | `{ hostName, avatar, settings }` | Creates a new room |
| `join_room` | Client ➔ Server | `{ roomId, playerName, avatar }` | Joins a room by code/ID |
| `quick_join` | Client ➔ Server | `{ playerName, avatar }` | Quick match into open lobby |
| `start_game` | Client ➔ Server | `{}` | Host starts the game |
| `round_start` | Server ➔ Client | `{ drawerId, wordOptions, drawTime }` | New round starts (drawer only) |
| `word_chosen` | Client ➔ Server | `{ word }` | Drawer selects a word |
| `draw_data` | Bidirectional | `{ id, type, color, size, points }` | Broadcast stroke data |
| `canvas_clear`| Bidirectional | `{}` | Clears canvas |
| `draw_undo` | Bidirectional | `{}` | Undos last stroke |
| `guess` | Client ➔ Server | `{ text }` | Player sends a guess |
| `guess_result`| Server ➔ Client | `{ correct, playerId, points, isFirst }` | Guess notification |
| `game_state` | Server ➔ Client | `{ phase, round, drawerId, hints... }` | Synchronized game state |
| `round_end` | Server ➔ Client | `{ word, scores, nextDrawer }` | Round ended, reveals word |
| `game_over` | Server ➔ Client | `{ winner, leaderboard }` | Match finished |

---

## 🚀 Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or pnpm

### Quick Setup

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd skribbl-clone
   ```

2. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

3. **Run in Development Mode (with hot reloading):**
   - Terminal 1 (Backend Server):
     ```bash
     npm run dev:server
     ```
   - Terminal 2 (Frontend Client):
     ```bash
     npm run dev:client
     ```
   - Open your browser at `http://localhost:5173`.

4. **Run in Production Mode (Single Port 4000):**
   ```bash
   npm run build
   npm start
   ```
   - Open your browser at `http://localhost:4000`.

---

## 🌐 Live Deployment Instructions

This application is built with a production-ready Express server that serves both the compiled React frontend and the real-time Socket.IO WebSocket server from a single port, making deployment simple on platforms with persistent WebSocket support.

### Option 1: Deploy on Render (Recommended)
1. Fork or push this repository to GitHub.
2. Sign in to [Render](https://render.com/) and click **New ➔ Web Service**.
3. Select your GitHub repository.
4. Set the following configuration:
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     npm run install:all && npm run build
     ```
   - **Start Command**:
     ```bash
     npm start
     ```
5. Click **Deploy Web Service**.
6. Render will assign you a live HTTPS/WSS URL (e.g. `https://your-skribbl-clone.onrender.com`).

### Option 2: Deploy on Railway
1. Push your repository to GitHub.
2. Log into [Railway](https://railway.app/) and create a **New Project ➔ Deploy from GitHub repo**.
3. Railway detects the Node project automatically.
4. Set Build Command: `npm run install:all && npm run build`
5. Set Start Command: `npm start`
6. In **Settings ➔ Networking**, generate a public domain.

### Option 3: Pair Vercel (Frontend) + Render/Railway (Backend)
- Deploy `server/` to Render or Railway.
- Deploy `client/` to Vercel and configure the environment variable:
  ```
  VITE_BACKEND_URL=https://your-websocket-backend.onrender.com
  ```

---

## 🧪 Testing Multiplayer Locally

To test multiplayer on your local machine:
1. Start the server (`npm start` or `npm run dev:server` + `npm run dev:client`).
2. Open `http://localhost:4000` (or `http://localhost:5173`) in an **incognito window** or a second browser (e.g., Chrome + Firefox).
3. In Window 1: Enter name "Alice", click **Create Private Room**, and copy the room code or invite link.
4. In Window 2: Enter name "Bob", paste the room code, and click **Join**.
5. Both players will appear in the lobby! Click **Start Game** as the host and enjoy drawing and guessing in real time!
