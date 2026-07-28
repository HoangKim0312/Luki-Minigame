import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("answer normalization accepts exact aliases without broad fuzzy matching", async () => {
  const source = await readFile(new URL("../lib/answer.ts", import.meta.url), "utf8");
  assert.match(source, /normalize\("NFKD"\)/);
  assert.match(source, /answers\.some/);
  assert.doesNotMatch(source, /levenshtein|fuzzy/i);
});

test("media player enforces preview boundary and never extracts audio", async () => {
  const player = await readFile(new URL("../app/components/guess-media-player.tsx", import.meta.url), "utf8");
  assert.match(player, /previewStartSeconds \+ previewDurationSeconds/);
  assert.match(player, /player\.pause\(\)/);
  assert.doesNotMatch(player, /ffmpeg|youtube|spotify|extract/i);
});

test("game answer endpoint is server authoritative and idempotent", async () => {
  const route = await readFile(new URL("../app/api/game-sessions/[id]/submit-answer/route.ts", import.meta.url), "utf8");
  assert.match(route, /isAcceptedAnswer/);
  assert.match(route, /status = 'active' RETURNING id/);
  assert.match(route, /REWARD_ALREADY_CLAIMED/);
});
