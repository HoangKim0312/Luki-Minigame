import { getChatGPTUser } from "@/app/chatgpt-auth";

export function jsonError(message: string, status = 400, code = "BAD_REQUEST") {
  return Response.json({ error: { code, message } }, { status });
}

export async function getRequestIdentity() {
  const user = await getChatGPTUser();
  if (user) {
    return { id: `user-${await sha256(user.email)}`, email: user.email, name: user.displayName, authenticated: true };
  }
  return { id: "guest-demo", email: "guest@archive.local", name: "Guest Restorer", authenticated: false };
}

export async function requireAdminIdentity() {
  const identity = await getRequestIdentity();
  const configured = (process.env.ADMIN_EMAILS ?? "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!identity.authenticated || !configured.includes(identity.email.toLowerCase())) return null;
  return identity;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 16).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function clampPreviewDuration(value: unknown) {
  const duration = Number(value);
  return [5, 10, 15, 20, 30].includes(duration) ? duration : 30;
}

