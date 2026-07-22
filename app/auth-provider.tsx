"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getBackendUrl } from "../lib/backend-url";

export type AccountUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "player";
  avatar?: string;
  createdAt?: string;
  stats?: { quizzesCreated: number };
};

export type Session = { token: string; refreshToken?: string; user: AccountUser };
type AuthStatus = "loading" | "authenticated" | "anonymous";
type AuthContextValue = {
  session: Session | null;
  status: AuthStatus;
  signIn: (session: Session) => void;
  signOut: () => void;
  refreshUser: () => Promise<AccountUser>;
};

const SESSION_KEY = "luki-session";
const SESSION_EVENT = "luki-auth-change";
const AuthContext = createContext<AuthContextValue | null>(null);

function parseSession(raw: string | null): Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Session>;
    if (!value.token || !value.user?.email || !value.user?.name || !value.user?.role) return null;
    return value as Session;
  } catch {
    return null;
  }
}

export function readSession(): Session | null {
  return typeof window === "undefined" ? null : parseSession(window.localStorage.getItem(SESSION_KEY));
}

function publishSession(session: Session | null) {
  if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  else window.localStorage.removeItem(SESSION_KEY);
  window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: session }));
}

async function refreshSession(session: Session): Promise<Session | null> {
  if (!session.refreshToken) return null;
  const response = await fetch(`${getBackendUrl()}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!response.ok) return null;
  return response.json() as Promise<Session>;
}

export async function authApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isLoginRequest = path === "/api/auth/login" || path === "/api/auth/register" || path === "/api/auth/refresh";
  let session = isLoginRequest ? null : readSession();
  const request = (current: Session | null) => fetch(`${getBackendUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(current?.token ? { Authorization: `Bearer ${current.token}` } : {}),
      ...options.headers,
    },
  });

  let response = await request(session);
  if (response.status === 401 && session && !isLoginRequest) {
    session = await refreshSession(session);
    if (session) {
      publishSession(session);
      response = await request(session);
    } else {
      publishSession(null);
    }
  }

  const data = await response.json() as T & { error?: string };
  if (!response.ok) {
    if (response.status === 401 && !isLoginRequest) publishSession(null);
    throw new Error(data.error || "API error");
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const signIn = useCallback((next: Session) => {
    publishSession(next);
    setSession(next);
    setStatus("authenticated");
  }, []);

  const signOut = useCallback(() => {
    publishSession(null);
    setSession(null);
    setStatus("anonymous");
  }, []);

  const refreshUser = useCallback(async () => {
    const user = await authApi<AccountUser>("/api/auth/me");
    const current = readSession();
    if (!current) throw new Error("Phiên đăng nhập đã hết hạn.");
    const next = { ...current, user };
    signIn(next);
    return user;
  }, [signIn]);

  useEffect(() => {
    const sync = (event?: Event) => {
      const next = event instanceof CustomEvent ? event.detail as Session | null : readSession();
      setSession(next);
      setStatus(next ? "authenticated" : "anonymous");
    };
    const validate = async () => {
      if (!readSession()) return sync();
      try { await refreshUser(); } catch { signOut(); }
    };
    const onStorage = (event: StorageEvent) => { if (event.key === SESSION_KEY) sync(); };
    window.addEventListener(SESSION_EVENT, sync);
    window.addEventListener("storage", onStorage);
    void validate();
    return () => {
      window.removeEventListener(SESSION_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, [refreshUser, signOut]);

  const value = useMemo(() => ({ session, status, signIn, signOut, refreshUser }), [session, status, signIn, signOut, refreshUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
