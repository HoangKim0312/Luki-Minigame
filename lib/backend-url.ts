const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const STORAGE_KEY = "luki-backend-url";

function validBackendUrl(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function getBackendUrl() {
  if (typeof window === "undefined") return DEFAULT_BACKEND_URL;
  const queryUrl = validBackendUrl(new URLSearchParams(window.location.search).get("server"));
  if (queryUrl) {
    window.localStorage.setItem(STORAGE_KEY, queryUrl);
    return queryUrl;
  }
  return validBackendUrl(window.localStorage.getItem(STORAGE_KEY)) || DEFAULT_BACKEND_URL;
}

export function setBackendUrl(value: string) {
  if (typeof window === "undefined") return false;
  const backendUrl = validBackendUrl(value);
  if (!backendUrl) return false;
  window.localStorage.setItem(STORAGE_KEY, backendUrl);
  return true;
}
