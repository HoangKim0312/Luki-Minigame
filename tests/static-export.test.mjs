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
});
