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

test("production demo never substitutes unrelated audio or video for an anime theme", async () => {
  const data = await readFile(new URL("../lib/archive-data.ts", import.meta.url), "utf8");
  const adapter = await readFile(new URL("../lib/animethemes-adapter.ts", import.meta.url), "utf8");
  const cleanup = await readFile(new URL("../supabase/migrations/202607280003_remove_fake_content.sql", import.meta.url), "utf8");
  assert.doesNotMatch(data, /SoundHelix|flower\.mp4|Demo royalty-free audio/);
  assert.match(data, /Guren no Yumiya/);
  assert.match(data, /ShingekiNoKyojin-OP1\.webm/);
  assert.match(adapter, /api\.animethemes\.moe/);
  assert.match(adapter, /themeType: theme\.type/);
  assert.match(cleanup, /validate_media_challenge_activation/);
  assert.match(cleanup, /approval_status <> 'approved'/);
});

test("large AnimeThemes catalog and 30+20 media quiz flow are implemented", async () => {
  const sync = await readFile(new URL("../scripts/sync-animethemes-catalog.mjs", import.meta.url), "utf8");
  const quiz = await readFile(new URL("../app/components/media-challenge-view.tsx", import.meta.url), "utf8");
  const server = await readFile(new URL("../server/index.ts", import.meta.url), "utf8");
  assert.match(sync, /SYNC_ANIME_LIMIT \|\| 300/);
  assert.match(sync, /page\[size\].*"100"/s);
  assert.doesNotMatch(sync, /writeFile|createWriteStream|fs\./i);
  assert.match(quiz, /slice\(0, 4\)/);
  assert.match(quiz, /multiple_choice/);
  assert.match(quiz, /autocomplete/);
  assert.match(quiz, /guessRemaining, setGuessRemaining\] = useState\(20\)/);
  assert.match(quiz, /catalog\/suggest/);
  assert.match(server, /media-start/);
  assert.match(server, /previewDurationSeconds \+ 20/);
  assert.match(server, /title: challenge\.media\?\.title/);
});
