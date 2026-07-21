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

function waitFor(socket, event, predicate) {
  return new Promise((resolve) => {
    const handler = (value) => {
      if (predicate(value)) { socket.off(event, handler); resolve(value); }
    };
    socket.on(event, handler);
  });
}

test("server protects secrets and runs realtime game transitions", async (context) => {
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
  const readyStatePromise = waitFor(guest, "server:room-state", state => state.players.some(player => player.name === "Host" && player.ready));
  await emit(host, "room:ready", { ready: true });
  const readyState = await readyStatePromise;
  assert.equal(readyState.players.find(player => player.name === "Host").ready, true);
  const lobbyChatPromise = waitFor(guest, "server:room-state", state => state.chatMessages.some(message => message.text === "Ready to play! 😀"));
  await emit(host, "room:chat", { message: "Ready to play! 😀" });
  const lobbyChatState = await lobbyChatPromise;
  assert.equal(lobbyChatState.chatMessages.at(-1).senderName, "Host");
  await emit(guest, "room:ready", { ready: true });
  await emit(host, "room:start", {});

  await emit(host, "game:submit-answer", { answer: "Phở" });
  const hiddenStatePromise = waitFor(guest, "server:room-state", state => state.answeredPlayerIds.length === 2);
  await emit(guest, "game:submit-answer", { answer: "Phở" });
  const hiddenState = await hiddenStatePromise;
  assert.equal(hiddenState.revealedAnswers, undefined);
  assert.equal(hiddenState.answeredPlayerIds.length, 2);

  const revealPromise = once(guest, "server:room-state");
  await emit(host, "game:reveal", {});
  const revealed = await revealPromise;
  assert.deepEqual(Object.values(revealed.revealedAnswers).sort(), ["Phở", "Phở"]);
  assert.equal(revealed.players.every((player) => player.score === 100), true);

  const numberHost = io(url, { transports: ["websocket"] });
  const numberGuest = io(url, { transports: ["websocket"] });
  context.after(() => { numberHost.disconnect(); numberGuest.disconnect(); });
  await Promise.all([once(numberHost, "connect"), once(numberGuest, "connect")]);
  const numberCreated = await emit(numberHost, "room:create", { name: "Nora", gameId: "number", language: "vi", rounds: 3 });
  const numberCode = numberCreated.data.room.code;
  await emit(numberGuest, "room:join", { code: numberCode, name: "Gus" });
  await emit(numberHost, "room:ready", { ready: true });
  await emit(numberGuest, "room:ready", { ready: true });
  const hostPrivatePromise = waitFor(numberHost, "server:private-state", state => Number.isInteger(state.secretNumber));
  const guestPrivatePromise = waitFor(numberGuest, "server:private-state", state => Number.isInteger(state.secretNumber));
  const numberPublicPromise = waitFor(numberGuest, "server:room-state", state => state.gameId === "number" && state.phase === "answering");
  await emit(numberHost, "room:start", {});
  const [hostPrivate, , numberPublic] = await Promise.all([hostPrivatePromise, guestPrivatePromise, numberPublicPromise]);
  assert.equal(numberPublic.numberRound.number, undefined);
  assert.equal(numberPublic.revealedAnswers, undefined);
  assert.equal(numberPublic.rounds, 0);

  const chatStatePromise = waitFor(numberGuest, "server:room-state", state => state.chatMessages.some(message => message.text === "Số này có lớn hơn 50 không? 🎯"));
  await emit(numberHost, "room:chat", { message: "Số này có lớn hơn 50 không? 🎯" });
  const chatState = await chatStatePromise;
  assert.equal(chatState.chatMessages.at(-1).senderName, "Nora");

  const correctStatePromise = waitFor(numberGuest, "server:room-state", state => state.numberRound?.status === "correct");
  const guessResult = await emit(numberGuest, "game:number-guess", { targetId: hostPrivate.playerId, guess: hostPrivate.secretNumber });
  assert.equal(guessResult.data.correct, true);
  const correctState = await correctStatePromise;
  assert.equal("number" in correctState.numberRound, false);

  const revealedNumberPromise = waitFor(numberGuest, "server:room-state", state => state.numberRound?.status === "revealed");
  await emit(numberHost, "game:number-reveal", {});
  const numberRevealed = await revealedNumberPromise;
  assert.equal(numberRevealed.numberRound.number, hostPrivate.secretNumber);

  const nextPrivatePromise = waitFor(numberGuest, "server:private-state", state => Number.isInteger(state.secretNumber));
  await emit(numberHost, "game:number-next", {});
  const nextPrivate = await nextPrivatePromise;
  assert.equal(Number.isInteger(nextPrivate.secretNumber), true);

  const convergenceHost = io(url, { transports: ["websocket"] });
  const convergenceGuest = io(url, { transports: ["websocket"] });
  context.after(() => { convergenceHost.disconnect(); convergenceGuest.disconnect(); });
  await Promise.all([once(convergenceHost, "connect"), once(convergenceGuest, "connect")]);
  const convergenceCreated = await emit(convergenceHost, "room:create", { name: "An", gameId: "convergence", language: "vi", rounds: 7 });
  assert.equal(convergenceCreated.ok, true);
  const convergenceCode = convergenceCreated.data.room.code;
  await emit(convergenceGuest, "room:join", { code: convergenceCode, name: "Bình" });
  await emit(convergenceHost, "room:ready", { ready: true });
  await emit(convergenceGuest, "room:ready", { ready: true });
  const convergenceStartedPromise = waitFor(convergenceGuest, "server:room-state", state => state.gameId === "convergence" && state.phase === "answering");
  await emit(convergenceHost, "room:start", {});
  const convergenceStarted = await convergenceStartedPromise;
  assert.equal(convergenceStarted.rounds, 0);
  assert.equal(convergenceStarted.convergence.status, "thinking");
  assert.equal(Object.values(convergenceStarted.convergence.words).length, 2);
  assert.equal(new Set(Object.values(convergenceStarted.convergence.words)).size, 2);

  await emit(convergenceHost, "game:convergence-submit", { answer: "Mưa" });
  const differentCountdownPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "countdown");
  const differentPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "different");
  await emit(convergenceGuest, "game:convergence-submit", { answer: "Nắng" });
  const differentCountdown = await differentCountdownPromise;
  assert.equal(differentCountdown.phase, "answering");
  assert.equal(differentCountdown.revealedAnswers, undefined);
  assert.equal(differentCountdown.convergence.answers, undefined);
  assert.equal(differentCountdown.answeredPlayerIds.length, 2);
  assert.equal(differentCountdown.convergence.revealAt > Date.now(), true);
  const different = await differentPromise;
  assert.deepEqual(Object.values(different.convergence.answers), ["Mưa", "Nắng"]);
  const continuedPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "thinking" && state.convergence.step === 2);
  await emit(convergenceGuest, "game:convergence-next", {});
  const continued = await continuedPromise;
  assert.deepEqual(Object.values(continued.convergence.words), ["Mưa", "Nắng"]);
  assert.equal(continued.revealedAnswers, undefined);

  await emit(convergenceHost, "game:convergence-submit", { answer: "Cà Phê!" });
  const matchedCountdownPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "countdown");
  const matchedPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "matched");
  await emit(convergenceGuest, "game:convergence-submit", { answer: "  ca   phe  " });
  const matchedCountdown = await matchedCountdownPromise;
  assert.equal(matchedCountdown.revealedAnswers, undefined);
  assert.equal(matchedCountdown.convergence.answers, undefined);
  const matched = await matchedPromise;
  assert.equal(matched.convergence.match, "Cà Phê!");
  assert.equal(matched.players.every((player) => player.score === 100), true);

  const restartedPromise = waitFor(convergenceGuest, "server:room-state", state => state.convergence?.status === "thinking" && state.convergence.step === 1);
  await emit(convergenceHost, "game:convergence-restart", {});
  const restarted = await restartedPromise;
  assert.equal(restarted.phase, "answering");
  assert.equal(restarted.answeredPlayerIds.length, 0);
});
