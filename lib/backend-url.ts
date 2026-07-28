const DEFAULT_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";
const STORAGE_KEY = "anigame-api-url";

export function getBackendUrl() {
  if (typeof window === "undefined") return DEFAULT_BACKEND_URL.replace(/\/$/, "");
  const fromQuery = new URLSearchParams(window.location.search).get("server");
  if (fromQuery) {
    const normalized = fromQuery.replace(/\/$/, "");
    window.localStorage.setItem(STORAGE_KEY, normalized);
    return normalized;
  }
  return (window.localStorage.getItem(STORAGE_KEY) || DEFAULT_BACKEND_URL).replace(/\/$/, "");
}
