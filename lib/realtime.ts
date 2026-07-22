import type { Locale } from "../app/i18n-provider";
import type { PublicTriviaQuestion, TriviaAnswerPayload, TriviaSubmissionResult } from "./trivia";

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
  trivia?: {
    quizId: string;
    quizTitle: string;
    quizDescription: string;
    quizCoverEmoji: string;
    questionCount: number;
    questionIndex: number;
    phase: "lobby" | "intro" | "answering" | "reveal" | "leaderboard" | "finished" | "paused";
    serverNow: number;
    questionStartedAt?: number;
    questionEndsAt?: number;
    pausedRemainingMs?: number;
    question?: PublicTriviaQuestion;
    reveal?: {
      correctOptionIds?: string[];
      acceptedAnswers?: string[];
      numberAnswer?: number;
      numberMinimum?: number;
      numberMaximum?: number;
      correctOrder?: string[];
      correctMatches?: Record<string, string>;
      explanation?: string;
      distribution: Record<string, number>;
    };
    previousRanks: Record<string, number>;
    streaks: Record<string, number>;
    autoAdvance: boolean;
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
  triviaSubmission?: TriviaSubmissionResult;
  triviaReview?: Array<{ questionId: string; prompt: string; playerAnswer: string; correctAnswer: string; points: number; responseTimeMs: number; correct?: boolean }>;
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
  "room:create": (input: { name: string; gameId: string; language: Locale; rounds: number; quizId?: string }, ack: (result: SocketAck<{ room: PublicRoomState; privateState: PrivateRoomState }>) => void) => void;
  "room:join": (input: { code: string; name: string; resumeToken?: string }, ack: (result: SocketAck<{ room: PublicRoomState; privateState: PrivateRoomState }>) => void) => void;
  "room:ready": (input: { ready: boolean }, ack: (result: SocketAck) => void) => void;
  "room:start": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "room:add-demo": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:submit-answer": (input: { answer: string }, ack: (result: SocketAck) => void) => void;
  "game:reveal": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:number-guess": (input: { targetId: string; guess: number }, ack: (result: SocketAck<{ correct: boolean }>) => void) => void;
  "room:chat": (input: { message: string }, ack: (result: SocketAck) => void) => void;
  "game:number-reveal": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:number-next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:convergence-submit": (input: { answer: string }, ack: (result: SocketAck) => void) => void;
  "game:convergence-next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "game:convergence-restart": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "trivia:submit-answer": (input: { answer: TriviaAnswerPayload }, ack: (result: SocketAck<{ potentialScore: number; submittedAt: number }>) => void) => void;
  "trivia:reveal": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "trivia:next": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "trivia:skip": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "trivia:pause": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
  "trivia:restart": (input: Record<string, never>, ack: (result: SocketAck) => void) => void;
}
