import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { io } from "socket.io-client";

const port = 8793;
const url = `http://127.0.0.1:${port}`;

function once(socket, event, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(event, handler); reject(new Error(`${event} timeout`)); }, timeoutMs);
    const handler = (...values) => { clearTimeout(timeout); resolve(values.length > 1 ? values : values[0]); };
    socket.once(event, handler);
  });
}

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(3000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result));
  });
}

function waitFor(socket, event, predicate, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { socket.off(event, handler); reject(new Error(`${event} predicate timeout`)); }, timeoutMs);
    const handler = (value) => {
      if (!predicate(value)) return;
      clearTimeout(timeout);
      socket.off(event, handler);
      resolve(value);
    };
    socket.on(event, handler);
  });
}

test("reconnect restores one player identity and stale sockets cannot own it", async (context) => {
  const server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "server/index.ts"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), GROQ_API_KEY: "", SESSION_SECRET: "reconnect-test-secret", DISCONNECT_GRACE_MS: "1000" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => server.kill());
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server start timeout")), 8000);
    server.stdout.on("data", chunk => {
      if (chunk.toString().includes("real-time backend")) { clearTimeout(timeout); resolve(); }
    });
    server.once("exit", code => reject(new Error(`server exited ${code}`)));
  });

  const sockets = [];
  const connect = async () => {
    const socket = io(url, { transports: ["websocket"], reconnection: false });
    sockets.push(socket);
    await once(socket, "connect");
    return socket;
  };
  context.after(() => sockets.forEach(socket => socket.disconnect()));

  const host = await connect();
  const originalGuest = await connect();
  const created = await emit(host, "room:create", { name: "Host", gameId: "wavelength", language: "vi", rounds: 2 });
  const code = created.data.room.code;
  const joined = await emit(originalGuest, "room:join", { code, name: "Guest" });
  const guestId = joined.data.privateState.playerId;
  const resumeToken = joined.data.privateState.resumeToken;
  await emit(host, "room:ready", { ready: true });
  await emit(originalGuest, "room:ready", { ready: true });
  await emit(host, "room:start", {});

  const reconnectingStatePromise = waitFor(host, "server:room-state", state => state.players.find(player => player.id === guestId)?.connectionStatus === "reconnecting");
  originalGuest.disconnect();
  const reconnectingState = await reconnectingStatePromise;
  assert.equal(reconnectingState.phase, "answering");
  assert.equal(reconnectingState.players.length, 2, "temporary disconnect must preserve membership");
  assert.equal(reconnectingState.players.find(player => player.id === guestId).ready, true, "player state must be preserved");

  const resumedGuest = await connect();
  const restoredStatePromise = waitFor(host, "server:room-state", state => state.players.find(player => player.id === guestId)?.connectionStatus === "connected");
  const resumed = await emit(resumedGuest, "room:join", { code, name: "Guest", resumeToken });
  const restoredState = await restoredStatePromise;
  assert.equal(resumed.data.privateState.playerId, guestId);
  assert.equal(restoredState.phase, "answering");
  assert.equal(restoredState.players.filter(player => player.id === guestId).length, 1, "resume must not create a duplicate player");

  const takeoverGuest = await connect();
  const replacedSocketPromise = once(resumedGuest, "disconnect");
  const takeoverStatePromise = waitFor(host, "server:room-state", state => state.players.find(player => player.id === guestId)?.connectionStatus === "connected" && state.revision > restoredState.revision);
  await emit(takeoverGuest, "room:join", { code, name: "Guest", resumeToken });
  await replacedSocketPromise;
  const takeoverState = await takeoverStatePromise;
  assert.equal(takeoverState.players.filter(player => player.id === guestId).length, 1, "new socket must take over the existing membership");

  const chatStatePromise = waitFor(host, "server:room-state", state => state.chatMessages.some(message => message.text === "reconnected"));
  const chatResult = await emit(takeoverGuest, "room:chat", { message: "reconnected" });
  assert.equal(chatResult.ok, true, "the current socket must be able to act after rejoining");
  const chatState = await chatStatePromise;
  assert.equal(chatState.chatMessages.at(-1).senderId, guestId);

  const reconnectingAgainPromise = waitFor(host, "server:room-state", state => state.players.find(player => player.id === guestId)?.connectionStatus === "reconnecting");
  takeoverGuest.disconnect();
  await reconnectingAgainPromise;
  const offlineState = await waitFor(host, "server:room-state", state => state.players.find(player => player.id === guestId)?.connectionStatus === "offline", 4000);
  assert.equal(offlineState.players.some(player => player.id === guestId), true, "active-game membership remains after grace while connection becomes offline");
});
