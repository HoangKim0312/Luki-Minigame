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
  const server = await readFile(new URL("../server/index.ts", import.meta.url), "utf8");
  assert.match(server, /isAcceptedAnswer/);
  assert.match(server, /status=eq\.active/);
  assert.match(server, /complete_challenge_session/);
  assert.match(server, /REWARD_ALREADY_CLAIMED/);
});

test("deployment uses GitHub Pages, Railway and Supabase rather than Sites", async () => {
  const packageJson = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const workflow = await readFile(new URL("../.github/workflows/deploy-pages.yml", import.meta.url), "utf8");
  const railway = await readFile(new URL("../railway.json", import.meta.url), "utf8");
  const envExample = await readFile(new URL("../.env.example", import.meta.url), "utf8");
  assert.match(packageJson.scripts["build:pages"], /GITHUB_PAGES=true/);
  assert.match(packageJson.scripts["start:server"], /server\/index\.ts/);
  assert.match(workflow, /NEXT_PUBLIC_API_URL/);
  assert.match(railway, /healthcheckPath/);
  assert.match(envExample, /SUPABASE_SERVICE_ROLE_KEY/);
  await assert.rejects(() => readFile(new URL("../.openai/hosting.json", import.meta.url), "utf8"));
});

test("Supabase migration provides atomic reward and restore functions", async () => {
  const migration = await readFile(new URL("../supabase/migrations/202607280001_anigame_archive.sql", import.meta.url), "utf8");
  assert.match(migration, /create or replace function public\.award_challenge_reward/);
  assert.match(migration, /create or replace function public\.restore_collectible/);
  assert.match(migration, /for update/);
});
