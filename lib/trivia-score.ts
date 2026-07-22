export type TriviaScoringMode =
  | "STANDARD"
  | "ACCURACY_ONLY"
  | "DOUBLE_POINTS"
  | "NO_POINTS";

export type PotentialScoreInput = {
  startedAt: number;
  endsAt: number;
  currentTime: number;
  maxScore?: number;
  minimumCorrectScore?: number;
  curveExponent?: number;
};

export type FinalTriviaScoreInput = PotentialScoreInput & {
  correct: boolean;
  scoringMode?: TriviaScoringMode;
};

export const DEFAULT_TRIVIA_SCORE = {
  maxScore: 1000,
  minimumCorrectScore: 200,
  expiredScore: 0,
  curveExponent: 1.2,
} as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/**
 * The single authoritative curve used by both the client preview and server award.
 * It drains gently at first, then more quickly near the end of the question.
 */
export function calculatePotentialScore({
  startedAt,
  endsAt,
  currentTime,
  maxScore = DEFAULT_TRIVIA_SCORE.maxScore,
  minimumCorrectScore = DEFAULT_TRIVIA_SCORE.minimumCorrectScore,
  curveExponent = DEFAULT_TRIVIA_SCORE.curveExponent,
}: PotentialScoreInput) {
  if (!Number.isFinite(startedAt) || !Number.isFinite(endsAt) || endsAt <= startedAt) {
    return DEFAULT_TRIVIA_SCORE.expiredScore;
  }

  if (currentTime >= endsAt) {
    return DEFAULT_TRIVIA_SCORE.expiredScore;
  }

  if (currentTime <= startedAt) {
    return Math.round(maxScore);
  }

  const safeMaximum = Math.max(0, maxScore);
  const safeMinimum = clamp(minimumCorrectScore, 0, safeMaximum);
  const progress = clamp((currentTime - startedAt) / (endsAt - startedAt), 0, 1);
  const remainingCurve = 1 - Math.pow(progress, Math.max(0.1, curveExponent));

  return Math.round(safeMinimum + (safeMaximum - safeMinimum) * remainingCurve);
}

export function getTriviaScoreRange(scoringMode: TriviaScoringMode = "STANDARD") {
  if (scoringMode === "DOUBLE_POINTS") {
    return { maxScore: 2000, minimumCorrectScore: 400 };
  }

  if (scoringMode === "ACCURACY_ONLY") {
    return { maxScore: 1000, minimumCorrectScore: 1000 };
  }

  if (scoringMode === "NO_POINTS") {
    return { maxScore: 0, minimumCorrectScore: 0 };
  }

  return {
    maxScore: DEFAULT_TRIVIA_SCORE.maxScore,
    minimumCorrectScore: DEFAULT_TRIVIA_SCORE.minimumCorrectScore,
  };
}

export function calculateFinalTriviaScore({
  correct,
  scoringMode = "STANDARD",
  ...timing
}: FinalTriviaScoreInput) {
  if (!correct || scoringMode === "NO_POINTS") return 0;
  if (scoringMode === "ACCURACY_ONLY") return 1000;

  const range = getTriviaScoreRange(scoringMode);
  return calculatePotentialScore({ ...timing, ...range });
}
