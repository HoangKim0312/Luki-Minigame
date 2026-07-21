import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";
import { io } from "socket.io-client";

const port = 8791;
const url = `http://127.0.0.1:${port}`;

function emit(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(3000).emit(event, payload, (error, result) => error ? reject(error) : resolve(result));
  });
}

function once(socket, event) {
  return new Promise((resolve) => socket.once(event, resolve));
}

test("server keeps answers private until the host reveals them", async (context) => {
  const server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "server/index.ts"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), GROQ_API_KEY: "", SESSION_SECRET: "integration-test-secret" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  context.after(() => server.kill());
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("server start timeout")), 8000);
    server.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("real-time backend")) { clearTimeout(timeout); resolve(); }
    });
    server.once("exit", (code) => reject(new Error(`server exited ${code}`)));
  });

  const host = io(url, { transports: ["websocket"] });
  const guest = io(url, { transports: ["websocket"] });
  context.after(() => { host.disconnect(); guest.disconnect(); });
  await Promise.all([once(host, "connect"), once(guest, "connect")]);

  const created = await emit(host, "room:create", { name: "Host", gameId: "wavelength", language: "vi", rounds: 1 });
  assert.equal(created.ok, true);
  const code = created.data.room.code;
  const joined = await emit(guest, "room:join", { code, name: "Guest" });
  assert.equal(joined.ok, true);
  await emit(host, "room:ready", { ready: true });
  await emit(guest, "room:ready", { ready: true });
  await emit(host, "room:start", {});

  await emit(host, "game:submit-answer", { answer: "Phở" });
  const hiddenStatePromise = once(guest, "server:room-state");
  await emit(guest, "game:submit-answer", { answer: "Phở" });
  const hiddenState = await hiddenStatePromise;
  assert.equal(hiddenState.revealedAnswers, undefined);
  assert.equal(hiddenState.answeredPlayerIds.length, 2);

  const revealPromise = once(guest, "server:room-state");
  await emit(host, "game:reveal", {});
  const revealed = await revealPromise;
  assert.deepEqual(Object.values(revealed.revealedAnswers).sort(), ["Phở", "Phở"]);
  assert.equal(revealed.players.every((player) => player.score === 100), true);
});
