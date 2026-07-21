import { getBackendUrl, setBackendUrl } from "./backend-url";

const DIRECTORY_URL = process.env.NEXT_PUBLIC_ROOM_DIRECTORY_URL
  || "https://luki-party-games-vn.luukimhoangffrk1.chatgpt.site";

function directoryEndpoint(code: string) {
  return `${DIRECTORY_URL}/api/room-directory/${encodeURIComponent(code)}`;
}

export async function registerRoomBackend(code: string) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const response = await fetch(directoryEndpoint(code), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ backendUrl: getBackendUrl() }),
    });
    if (response.ok) return;
    if (response.status < 500) break;
    await new Promise(resolve => window.setTimeout(resolve, 1_000));
  }
  throw new Error("Không thể công bố mã phòng cho người chơi khác.");
}

export async function resolveRoomBackend(code: string) {
  try {
    const response = await fetch(directoryEndpoint(code), { cache: "no-store" });
    if (!response.ok) return false;
    const data = await response.json() as { backendUrl?: string };
    return typeof data.backendUrl === "string" && setBackendUrl(data.backendUrl);
  } catch {
    return false;
  }
}
