function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function signature(value: string) {
  const secret = process.env.MEDIA_SIGNING_SECRET;
  if (!secret) throw new Error("MEDIA_SIGNING_SECRET chưa được cấu hình.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signed = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(signed));
}

export async function createPlaybackToken(storageKey: string, expiresAt: number, mode: "preview" | "revealed" | "upload") {
  const payload = `${storageKey}:${expiresAt}:${mode}`;
  return `${expiresAt}.${mode}.${await signature(payload)}`;
}

export async function verifyPlaybackToken(storageKey: string, token: string, expectedMode?: "preview" | "revealed" | "upload") {
  const [expiresRaw, mode, provided] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!expiresAt || expiresAt < Date.now() || !provided || (expectedMode && mode !== expectedMode)) return false;
  const expected = await signature(`${storageKey}:${expiresAt}:${mode}`);
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let index = 0; index < provided.length; index += 1) mismatch |= provided.charCodeAt(index) ^ expected.charCodeAt(index);
  return mismatch === 0;
}

