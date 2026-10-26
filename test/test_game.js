const assert = require("assert");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const ioClient = require("socket.io-client");
const RoomManager = require("../server/RoomManager");

async function runTestSuite() {
  console.log("==================================================");
  console.log("   SKRIBBL CLONE - AUTOMATED TEST SUITE           ");
  console.log("==================================================");

  // Setup Test Server on ephemeral port
  const app = express();
  const server = http.createServer(app);
  const io = new Server(server, { cors: { origin: "*" } });
  const roomManager = new RoomManager(io);

  io.on("connection", (socket) => {
    socket.on("room:create", (data, cb) => {
      const room = roomManager.createRoom(data.settings || {});
      const res = roomManager.joinRoom(socket, room.code, data.name, data.avatar);
      cb({ success: true, roomCode: room.code, player: res.player, room: room.getPublicState(socket.id) });
    });

    socket.on("room:join", (data, cb) => {
      const res = roomManager.joinRoom(socket, data.roomCode, data.name, data.avatar);
      cb(res);
    });

    socket.on("game:start", (cb) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      cb(room.startGame(socket.id));
    });

    socket.on("game:select_word", (word) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (room) room.selectWord(socket.id, word);
    });

    socket.on("draw:action", (action) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (room) room.handleDrawAction(socket.id, action);
    });

    socket.on("chat:message", (text) => {
      const room = roomManager.getRoomBySocketId(socket.id);
      if (room) room.handleChatMessage(socket.id, text);
    });

    socket.on("disconnect", () => {
      roomManager.leaveRoom(socket.id);
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  const serverUrl = `http://127.0.0.1:${port}`;
  console.log(`[Test Server] Running on ${serverUrl}`);

  function createClient() {
    return ioClient(serverUrl, {
      transports: ["websocket"],
      reconnection: false,
      forceNew: true
    });
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Room Creation & Joining
    // ----------------------------------------------------
    console.log("\n[TEST 1] Testing Room Creation & Joining...");
    const clientAlice = createClient();
    const clientBob = createClient();

    await new Promise((res) => clientAlice.on("connect", res));
    await new Promise((res) => clientBob.on("connect", res));

    let roomCode = null;
    await new Promise((resolve) => {
      clientAlice.emit(
        "room:create",
        { name: "Alice", avatar: { color: "#ef4444", eyes: 1, mouth: 1 } },
        (res) => {
          assert.strictEqual(res.success, true, "Alice should create room successfully");
          assert.ok(res.roomCode, "Room code should exist");
          roomCode = res.roomCode;
          console.log(`  -> Alice created room: ${roomCode}`);
          resolve();
        }
      );
    });

    await new Promise((resolve) => {
      clientBob.emit(
        "room:join",
        { roomCode, name: "Bob", avatar: { color: "#3b82f6", eyes: 2, mouth: 2 } },
        (res) => {
          assert.strictEqual(res.success, true, "Bob should join room successfully");
          console.log(`  -> Bob joined room: ${roomCode}`);
          resolve();
        }
      );
    });

    const activeRoom = roomManager.getRoom(roomCode);
    assert.strictEqual(activeRoom.players.size, 2, "Room should contain exactly 2 players");
    console.log("  ✔ Test 1 Passed: Room creation and joining verified.");

    // ----------------------------------------------------
    // TEST 2: Turn-based Game Start & Word Selection
    // ----------------------------------------------------
    console.log("\n[TEST 2] Testing Turn-based Game Start & Word Selection...");

    let wordChoicesPromise = new Promise((resolve) => {
      clientAlice.on("game:word_choices", (words) => {
        assert.strictEqual(words.length, 3, "Drawer should receive 3 word choices");
        console.log(`  -> Drawer Alice received word choices: [${words.join(", ")}]`);
        resolve(words);
      });
    });

    let bobTurnStartPromise = new Promise((resolve) => {
      clientBob.on("game:turn_start", (data) => {
        assert.strictEqual(data.round, 1, "Should be round 1");
        assert.strictEqual(data.drawerName, "Alice", "Alice should be drawer");
        console.log(`  -> Bob received turn start: Alice is drawing`);
        resolve();
      });
    });

    // Alice starts the game
    await new Promise((resolve) => {
      clientAlice.emit("game:start", (res) => {
        assert.strictEqual(res.success, true, "Alice should start game successfully");
        resolve();
      });
    });

    const [words] = await Promise.all([wordChoicesPromise, bobTurnStartPromise]);
    const chosenWord = words[0];

    let bobGuessTurnPromise = new Promise((resolve) => {
      clientBob.on("game:guess_turn", (data) => {
        assert.strictEqual(data.length, chosenWord.length, "Guesser receives correct word length");
        assert.ok(data.hint.includes("_"), "Hint should contain masked underscores");
        console.log(`  -> Bob received masked word hint: "${data.hint}"`);
        resolve();
      });
    });

    // Alice chooses word
    clientAlice.emit("game:select_word", chosenWord);
    await bobGuessTurnPromise;
    console.log(`  ✔ Test 2 Passed: Turn start and word selection verified.`);

    // ----------------------------------------------------
    // TEST 3: Real-Time Drawing Stroke Streaming
    // ----------------------------------------------------
    console.log("\n[TEST 3] Testing Real-Time Drawing Synchronization...");

    const strokeData = {
      type: "segment",
      x1: 100,
      y1: 150,
      x2: 250,
      y2: 300,
      color: "#ef4444",
      size: 6
    };

    let strokeReceivedPromise = new Promise((resolve) => {
      clientBob.on("draw:action", (action) => {
        assert.strictEqual(action.type, "segment");
        assert.strictEqual(action.x1, 100);
        assert.strictEqual(action.x2, 250);
        assert.strictEqual(action.color, "#ef4444");
        console.log(`  -> Bob received real-time stroke from Alice: (100,150) -> (250,300)`);
        resolve();
      });
    });

    clientAlice.emit("draw:action", strokeData);
    await strokeReceivedPromise;
    console.log("  ✔ Test 3 Passed: Real-time canvas streaming verified.");

    // ----------------------------------------------------
    // TEST 4: Guessing, Close Guess Detection, & Scoring
    // ----------------------------------------------------
    console.log("\n[TEST 4] Testing Close Guess Detection & Scoring...");

    // Test close guess (1 character off)
    let closeGuessPromise = new Promise((resolve) => {
      clientBob.on("chat:close", ({ guess }) => {
        console.log(`  -> Bob received 'Close Guess' alert for: "${guess}"`);
        resolve();
      });
    });

    const almostWord = chosenWord.slice(0, -1); // 1 letter short
    clientBob.emit("chat:message", almostWord);
    await closeGuessPromise;

    // Test correct guess
    let correctGuessPromise = new Promise((resolve) => {
      clientBob.on("game:you_guessed", ({ word, points }) => {
        assert.strictEqual(word, chosenWord, "Revealed word matches chosen word");
        assert.ok(points > 100, "Should award points");
        console.log(`  -> Bob guessed correctly! Awarded ${points} points.`);
        resolve();
      });
    });

    let roundEndPromise = new Promise((resolve) => {
      clientBob.on("game:round_end", ({ word }) => {
        assert.strictEqual(word, chosenWord);
        console.log(`  -> Round ended automatically since all players guessed.`);
        resolve();
      });
    });

    clientBob.emit("chat:message", chosenWord);
    await Promise.all([correctGuessPromise, roundEndPromise]);

    // Verify final scores
    const bobPlayer = activeRoom.players.get(clientBob.id);
    const alicePlayer = activeRoom.players.get(clientAlice.id);

    assert.ok(bobPlayer.score > 0, "Guesser score should be > 0");
    assert.ok(alicePlayer.score > 0, "Drawer score should be > 0");
    console.log(`  -> Current Scores: Bob = ${bobPlayer.score} pts, Alice = ${alicePlayer.score} pts`);
    console.log("  ✔ Test 4 Passed: Scoring and turn conclusion verified.");

    // ----------------------------------------------------
    // TEST 5: Disconnect & Room Cleanup
    // ----------------------------------------------------
    console.log("\n[TEST 5] Testing Disconnect and Room Cleanup...");
    clientAlice.disconnect();
    clientBob.disconnect();

    await new Promise((resolve) => setTimeout(resolve, 300));
    assert.strictEqual(roomManager.rooms.has(roomCode), false, "Empty room should be cleaned up");
    console.log("  ✔ Test 5 Passed: Disconnect and room memory cleanup verified.");

    console.log("\n==================================================");
    console.log("   ALL 5 TESTS PASSED SUCCESSFULLY! (100% HEALTHY) ");
    console.log("==================================================");

  } finally {
    server.close();
  }
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
