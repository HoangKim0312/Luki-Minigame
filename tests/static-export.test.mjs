import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const exported = new URL("../out/", import.meta.url);

test("exports every GitHub Pages route", async () => {
  await Promise.all([
    access(new URL("index.html", exported)),
    access(new URL("create/index.html", exported)),
    access(new URL("games/index.html", exported)),
    access(new URL("play/index.html", exported)),
    access(new URL("room/index.html", exported)),
    access(new URL("login/index.html", exported)),
    access(new URL("admin/index.html", exported)),
    access(new URL(".nojekyll", exported)),
  ]);
});

test("uses the repository base path and Vietnamese-first content", async () => {
  const html = await readFile(new URL("index.html", exported), "utf8");
  assert.match(html, /<html lang="vi"/i);
  assert.match(html, /Ít ngại ngùng\./);
  assert.match(html, /Nhiều chuyện để nói\./);
  assert.match(html, /\/Luki-Minigame\/_next\//);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape/i);
  assert.match(html, /AI/);
});

test("persists a shared backend URL before client-side navigation", async () => {
  const source = await readFile(new URL("../app/party-app.tsx", import.meta.url), "utf8");
  assert.match(source, /function PartyApp[\s\S]*?useEffect\(\(\)=>\{getBackendUrl\(\);/);

  const launcher = await readFile(new URL("../scripts/dev-online.mjs", import.meta.url), "utf8");
  assert.match(launcher, /siteUrl\}play\/\?server=/);
  assert.match(launcher, /monitorTunnel\(tunnel\)/);
  assert.match(launcher, /Cloudflare tunnel stopped unexpectedly/);
});
