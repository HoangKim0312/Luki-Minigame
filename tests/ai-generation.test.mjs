import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import test from "node:test";

const port = 8794;
const url = `http://127.0.0.1:${port}`;

test("AI generation fails clearly instead of returning offline placeholders", async (context) => {
  const server = spawn(process.execPath, ["node_modules/tsx/dist/cli.mjs", "server/index.ts"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), GROQ_API_KEY: "", SESSION_SECRET: "ai-test-secret" },
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

  const health = await fetch(`${url}/health`).then(response => response.json());
  assert.deepEqual(health.ai, { configured: false, provider: "groq", model: "openai/gpt-oss-20b" });

  const response = await fetch(`${url}/api/trivia/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topic: "Kiến thức Việt Nam",
      language: "Vietnamese",
      difficulty: "MIXED",
      count: 5,
      types: ["SINGLE_CHOICE", "TRUE_FALSE"],
    }),
  });
  const body = await response.json();
  assert.equal(response.status, 503);
  assert.equal(body.retryable, true);
  assert.match(body.error, /GROQ_API_KEY/);
  assert.equal("questions" in body, false, "failed generation must never return template questions");
  assert.doesNotMatch(JSON.stringify(body), /Bản nháp AI ngoại tuyến|Đáp án 1|câu hỏi 1/iu);
});
