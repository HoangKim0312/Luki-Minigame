import type { Locale } from "../app/i18n-provider";

export type RoomPhase = "lobby" | "answering" | "reveal" | "finished";

export type PublicPlayer = {
  id: string;
  name: string;
  ready: boolean;
  score: number;
  connected: boolean;
  isBot?: boolean;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  at: number;
};

export type PublicRoomState = {
  code: string;
  hostId: string;
  gameId: string;
  language: Locale;
  rounds: number;
  round: number;
  phase: RoomPhase;
  players: PublicPlayer[];
  chatMessages: ChatMessage[];
  answeredPlayerIds: string[];
  revealedAnswers?: Record<string, string>;
  question: string;
  numberRound?:
    | { status: "playing" }
    | { status: "correct"; targetId: string; targetName: string; guesserName: string }
    | { status: "revealed"; targetId: string; targetName: string; guesserName: string; number: number };
  convergence?: {
    step: number;
    words: Record<string, string>;
    status: "thinking" | "countdown" | "different" | "matched";
    answers?: Record<string, string>;
    match?: string;
    revealAt?: number;
  };
  revision: number;
  createdAt: number;
  expiresAt: number;
};

export type PrivateRoomState = {
  playerId: string;
  answer?: string;
  resumeToken: string;
  secretNumber?: number;
};

export type SocketAck<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface ServerToClientEvents {
  "server:room-state": (room: PublicRoomState) => void;
  "server:private-state": (state: PrivateRoomState) => void;
  "server:game-event": (event: { type: string; message: string; at: number }) => void;
  "server:error": (error: { message: string }) => void;
}

export interface ClientToServerEvents {
  "room:create": (input: { name: string; gameId: string; language: Locale; rounds: number }, ack: (result: SocketAck<{ room: PublicRoomState; privateState: PrivateRoomState }>) => void) => void;
  "room:join": (input: { code: string; name: string; resumeToken?: string }, ack: (result: SocketAck<{ room: PublicRoomState; privateState: PrivateRoomState }>) => void) => void;
  "room:ready": (input: { ready: boolean }, ack: (result: SocketAck) => void) => void;
  "room:start": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "room:add-demo": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:submit-answer": (input: { answer: string }, ack: (result: SocketAck) => void) => void;
  "game:reveal": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:number-guess": (input: { targetId: string; guess: number }, ack: (result: SocketAck<{ correct: boolean }>) => void) => void;
  "game:number-chat": (input: { message: string }, ack: (result: SocketAck) => void) => void;
  "game:number-reveal": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:number-next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:convergence-submit": (input: { answer: string }, ack: (result: SocketAck) => void) => void;
  "game:convergence-next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:convergence-restart": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
}
