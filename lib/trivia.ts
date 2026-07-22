import type { TriviaScoringMode } from "./trivia-score";

export type TriviaQuestionType =
  | "SINGLE_CHOICE"
  | "MULTIPLE_CHOICE"
  | "TRUE_FALSE"
  | "TEXT_INPUT"
  | "NUMBER_INPUT"
  | "SCALE"
  | "POLL"
  | "ORDER"
  | "MATCHING"
  | "IMAGE_CHOICE";

export type TriviaDifficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";
export type TriviaVisibility = "PRIVATE" | "UNLISTED" | "PUBLIC";

export type TriviaMedia = {
  type: "IMAGE" | "GIF" | "VIDEO";
  url: string;
  alt?: string;
};

export type TriviaOption = {
  id: string;
  text?: string;
  imageUrl?: string;
  emoji?: string;
  correct?: boolean;
  order?: number;
  matchWith?: string;
};

export type TriviaQuestionConfig = {
  acceptedAnswers?: string[];
  caseInsensitive?: boolean;
  accentInsensitive?: boolean;
  trimWhitespace?: boolean;
  numberMode?: "EXACT" | "RANGE";
  numberAnswer?: number;
  tolerance?: number;
  numberMinimum?: number;
  numberMaximum?: number;
  scaleMinimum?: number;
  scaleMaximum?: number;
  scaleStep?: number;
  scaleMinimumLabel?: string;
  scaleMaximumLabel?: string;
  correctOrder?: string[];
  correctMatches?: Record<string, string>;
  allowAnswerChanges?: boolean;
  shuffleAnswers?: boolean;
};

export type TriviaQuestion = {
  id: string;
  type: TriviaQuestionType;
  prompt: string;
  description?: string;
  options: TriviaOption[];
  config: TriviaQuestionConfig;
  timeLimitSeconds: number;
  scoringMode: TriviaScoringMode;
  explanation?: string;
  difficulty: Exclude<TriviaDifficulty, "MIXED">;
  category?: string;
  tags: string[];
  media?: TriviaMedia;
};

export type TriviaQuizSettings = {
  defaultTimerSeconds: number;
  defaultScoringMode: TriviaScoringMode;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  leaderboardFrequency: "EVERY_QUESTION" | "EVERY_3" | "EVERY_5" | "FINAL_ONLY";
  autoAdvance: boolean;
  showCorrectAnswer: boolean;
  showExplanation: boolean;
};

export type TriviaQuiz = {
  id: string;
  title: string;
  description: string;
  coverEmoji: string;
  coverImage?: string;
  category: string;
  language: string;
  visibility: TriviaVisibility;
  creator: string;
  creatorId?: string;
  plays: number;
  createdAt: string;
  updatedAt: string;
  questions: TriviaQuestion[];
  settings: TriviaQuizSettings;
};

export type TriviaAnswerPayload = {
  optionIds?: string[];
  text?: string;
  number?: number;
  scale?: number;
  order?: string[];
  matches?: Record<string, string>;
};

export type PublicTriviaQuestion = Omit<TriviaQuestion, "options" | "config"> & {
  options: Array<Omit<TriviaOption, "correct" | "order" | "matchWith">>;
  config: Pick<
    TriviaQuestionConfig,
    | "scaleMinimum"
    | "scaleMaximum"
    | "scaleStep"
    | "scaleMinimumLabel"
    | "scaleMaximumLabel"
    | "allowAnswerChanges"
  >;
};

export type TriviaSubmissionResult = {
  questionId: string;
  submittedAt: number;
  potentialScore: number;
  correct?: boolean;
  awardedScore?: number;
  responseTimeMs?: number;
};

export const questionTypeLabels: Record<TriviaQuestionType, string> = {
  SINGLE_CHOICE: "Một đáp án",
  MULTIPLE_CHOICE: "Nhiều đáp án",
  TRUE_FALSE: "Đúng / Sai",
  TEXT_INPUT: "Điền câu trả lời",
  NUMBER_INPUT: "Nhập số",
  SCALE: "Thang điểm",
  POLL: "Bình chọn",
  ORDER: "Sắp xếp",
  MATCHING: "Ghép cặp",
  IMAGE_CHOICE: "Chọn hình ảnh",
};

export const triviaTimerPresets = [5, 10, 15, 20, 30, 45, 60, 90, 120] as const;

export const defaultTriviaSettings: TriviaQuizSettings = {
  defaultTimerSeconds: 20,
  defaultScoringMode: "STANDARD",
  shuffleQuestions: false,
  shuffleAnswers: true,
  leaderboardFrequency: "EVERY_QUESTION",
  autoAdvance: false,
  showCorrectAnswer: true,
  showExplanation: true,
};

export function createTriviaQuestion(
  type: TriviaQuestionType = "SINGLE_CHOICE",
  index = 0,
): TriviaQuestion {
  const id = `question-${Date.now()}-${index}`;
  const base: TriviaQuestion = {
    id,
    type,
    prompt: "Câu hỏi thú vị của bạn là gì?",
    options: [],
    config: { allowAnswerChanges: false, shuffleAnswers: true },
    timeLimitSeconds: 20,
    scoringMode: type === "POLL" || type === "SCALE" ? "NO_POINTS" : "STANDARD",
    difficulty: "MEDIUM",
    tags: [],
  };

  if (type === "TRUE_FALSE") {
    base.options = [
      { id: `${id}-true`, text: "Đúng", emoji: "✓", correct: true },
      { id: `${id}-false`, text: "Sai", emoji: "✕", correct: false },
    ];
  } else if (["SINGLE_CHOICE", "MULTIPLE_CHOICE", "POLL", "IMAGE_CHOICE"].includes(type)) {
    base.options = [0, 1, 2, 3].map((optionIndex) => ({
      id: `${id}-option-${optionIndex}`,
      text: `Đáp án ${optionIndex + 1}`,
      correct: optionIndex === 0 && type !== "POLL",
    }));
  } else if (type === "SCALE") {
    base.config = {
      ...base.config,
      scaleMinimum: 1,
      scaleMaximum: 10,
      scaleStep: 1,
      scaleMinimumLabel: "Không thích",
      scaleMaximumLabel: "Rất thích",
    };
  } else if (type === "TEXT_INPUT") {
    base.config = {
      ...base.config,
      acceptedAnswers: ["Câu trả lời"],
      caseInsensitive: true,
      accentInsensitive: true,
      trimWhitespace: true,
    };
  } else if (type === "NUMBER_INPUT") {
    base.config = { ...base.config, numberMode: "EXACT", numberAnswer: 0, tolerance: 0 };
  } else if (type === "ORDER") {
    base.options = [0, 1, 2, 3].map((optionIndex) => ({
      id: `${id}-order-${optionIndex}`,
      text: `Mục ${optionIndex + 1}`,
      order: optionIndex,
    }));
    base.config.correctOrder = base.options.map((option) => option.id);
  } else if (type === "MATCHING") {
    base.options = [
      { id: `${id}-match-1`, text: "Nhật Bản", matchWith: "Tokyo" },
      { id: `${id}-match-2`, text: "Việt Nam", matchWith: "Hà Nội" },
    ];
    base.config.correctMatches = Object.fromEntries(
      base.options.map((option) => [option.id, option.matchWith ?? ""]),
    );
  }

  return base;
}

export function createEmptyTriviaQuiz(): TriviaQuiz {
  const now = new Date().toISOString();
  return {
    id: `quiz-${Date.now()}`,
    title: "Bộ câu hỏi chưa đặt tên",
    description: "Một cuộc đấu trí mới đang chờ hội bạn của bạn.",
    coverEmoji: "🧠",
    category: "Party",
    language: "vi",
    visibility: "PRIVATE",
    creator: "Bạn",
    plays: 0,
    createdAt: now,
    updatedAt: now,
    questions: [createTriviaQuestion("SINGLE_CHOICE")],
    settings: { ...defaultTriviaSettings },
  };
}

export function getEstimatedQuizMinutes(quiz: Pick<TriviaQuiz, "questions">) {
  const activeSeconds = quiz.questions.reduce((total, question) => total + question.timeLimitSeconds, 0);
  const transitionSeconds = quiz.questions.length * 7;
  return Math.max(1, Math.ceil((activeSeconds + transitionSeconds) / 60));
}
