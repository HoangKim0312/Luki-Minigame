"use client";

import { io, Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents, SocketAck } from "./realtime";
import { getBackendUrl } from "./backend-url";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;
let socketUrl = "";

export function getSocket() {
  const backendUrl = getBackendUrl();
  if (!socket || socketUrl !== backendUrl) {
    socket?.disconnect();
    socketUrl = backendUrl;
    socket = io(backendUrl, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      randomizationFactor: 0.4,
    });
  }
  return socket;
}

export async function connectSocket(timeoutMs = 8000) {
  const client = getSocket();
  if (client.connected) return client;
  client.connect();
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => { cleanup(); reject(new Error("Không thể kết nối máy chủ thời gian thực.")); }, timeoutMs);
    const connected = () => { cleanup(); resolve(); };
    const failed = (error: Error) => { cleanup(); reject(error); };
    const cleanup = () => { window.clearTimeout(timeout); client.off("connect", connected); client.off("connect_error", failed); };
    client.once("connect", connected);
    client.once("connect_error", failed);
  });
  return client;
}

export function emitWithAck<T>(event: keyof ClientToServerEvents, payload: unknown) {
  const client = getSocket();
  return new Promise<SocketAck<T>>((resolve) => {
    if (!client.connected) {
      resolve({ ok: false, error: "Đang kết nối lại với phòng…" });
      return;
    }
    const emitter = client.timeout(8000) as unknown as { emit: (name: string, data: unknown, callback: (error: Error | null, result: SocketAck<T>) => void) => void };
    emitter.emit(event, payload, (error, result) => {
      resolve(error ? { ok: false, error: "Máy chủ không phản hồi." } : result);
    });
  });
}
