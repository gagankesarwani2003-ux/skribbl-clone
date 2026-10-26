# Skribbl Clone 🎨

A full-featured, high-performance real-time multiplayer drawing and guessing game inspired by [skribbl.io](https://skribbl.io/). Reverse-engineered using **REA (Reverse Engineer Anything)** to extract the core game loop, canvas synchronization mechanics, and scoring algorithms.

---

## 🌟 Features Implemented

1. **Multiplayer Rooms:**
   - Public Quick Play matchmaking (instantly find an active room or create one).
   - Custom Private Rooms with unique 6-character room codes (e.g., `JD7QPC`).
   - One-click invite link copying (`http://localhost:3000/?room=CODE`).
   - Host controls: configurable rounds (2–8) and turn drawing time (40–100s).

2. **Turn-Based Drawing:**
   - Cyclical turns through all connected players in the room.
   - Word selection modal: 3 categorized words chosen at random for the active drawer.
   - 15-second selection timer with automatic fallback selection if time runs out.
   - Progressive letter reveal hints at 60% and 30% remaining time.

3. **Real-Time Drawing Engine:**
   - HTML5 Canvas with normalized virtual resolution (`800x600`) for identical rendering across all screen sizes.
   - 24-color vibrant palette swatches.
   - 4 brush sizes (Small, Medium, Large, Huge).
   - Drawing tools: Brush, Eraser, Stack-based Flood Fill Bucket (BFS), Clear Canvas, and Undo.
   - Sub-millisecond latency stroke streaming over WebSockets.

4. **Dynamic Scoring & Guessing:**
   - Guess matching with automatic word hiding for already-guessed players.
   - Fast guess bonus: up to 500 points for rapid answers with time-decay formula.
   - Drawer rewards: bonus points distributed proportionally to how many guessers solved the sketch.
   - "Close Guess" detection using Levenshtein distance $\le 1$ with private warning alerts.
   - Game Over celebration podium for 1st, 2nd, and 3rd place with replay functionality.

5. **Audio & UI Polish:**
   - Zero-dependency sound effects synthesized in real time via the Web Audio API (chimes, countdown ticks, fanfare, join pops).
   - Customizable avatar builder (10 colors, 5 eye styles, 5 mouth expressions).
   - Fully responsive layout for desktop, tablet, and mobile browsers.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ or v22+
- `npm`

### Installation
```bash
# Navigate to the project directory
cd skribbl-clone

# Install dependencies
npm install
```

### Running the Server
```bash
npm start
```
The game will start on `http://localhost:3000`.

### Running Automated Tests
```bash
npm test
```
Runs the automated test suite simulating multiple virtual WebSocket players, room joins, drawing stroke streaming, close guesses, correct guesses, scoring, and cleanup.

---

## 📁 Project Architecture

```
skribbl-clone/
├── package.json               # Dependencies and scripts
├── server/
│   ├── server.js              # Express HTTP + Socket.io gateway
│   ├── RoomManager.js         # Room matchmaking, lifecycle, and memory management
│   ├── GameRoom.js            # Room state machine, turn scheduler, scoring, and drawing relay
│   └── words.js               # Rich categorized word database
├── public/
│   ├── index.html             # Single-page responsive HTML5 layout
│   ├── css/
│   │   └── style.css          # Skribbl-inspired bubbly theme and HUD styling
│   └── js/
│       ├── audio.js           # Web Audio API sound synthesizer
│       ├── canvas.js          # Normalized HTML5 canvas drawing and flood-fill engine
│       └── client.js          # Client-side Socket.io state machine and UI controller
└── test/
    └── test_game.js           # End-to-end multi-client automated test suite
```
