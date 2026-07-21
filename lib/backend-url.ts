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
  const configuredUrl = validBackendUrl(DEFAULT_BACKEND_URL);
  if (configuredUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(configuredUrl)) {
    window.localStorage.setItem(STORAGE_KEY, configuredUrl);
    return configuredUrl;
  }
  return validBackendUrl(window.localStorage.getItem(STORAGE_KEY)) || configuredUrl || DEFAULT_BACKEND_URL;
}
