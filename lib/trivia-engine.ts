import type {
  PublicTriviaQuestion,
  TriviaAnswerPayload,
  TriviaQuestion,
} from "./trivia";

function normalizeText(value: string, question: TriviaQuestion) {
  let result = value;
  if (question.config.trimWhitespace !== false) result = result.trim().replace(/\s+/g, " ");
  if (question.config.caseInsensitive !== false) result = result.toLocaleLowerCase("vi");
  if (question.config.accentInsensitive) {
    result = result.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  }
  return result;
}

const sameSet = (left: string[], right: string[]) =>
  left.length === right.length && left.every((value) => right.includes(value));

export function evaluateTriviaAnswer(question: TriviaQuestion, answer: TriviaAnswerPayload) {
  if (question.scoringMode === "NO_POINTS" || question.type === "POLL" || question.type === "SCALE") {
    return null;
  }

  if (["SINGLE_CHOICE", "TRUE_FALSE", "IMAGE_CHOICE"].includes(question.type)) {
    const correct = question.options.find((option) => option.correct)?.id;
    return Boolean(correct && answer.optionIds?.length === 1 && answer.optionIds[0] === correct);
  }

  if (question.type === "MULTIPLE_CHOICE") {
    const correct = question.options.filter((option) => option.correct).map((option) => option.id);
    return sameSet(correct, answer.optionIds ?? []);
  }

  if (question.type === "TEXT_INPUT") {
    const submitted = normalizeText(answer.text ?? "", question);
    return (question.config.acceptedAnswers ?? []).some(
      (accepted) => normalizeText(accepted, question) === submitted,
    );
  }

  if (question.type === "NUMBER_INPUT") {
    const submitted = answer.number;
    if (typeof submitted !== "number" || !Number.isFinite(submitted)) return false;
    if (question.config.numberMode === "RANGE") {
      return (
        submitted >= (question.config.numberMinimum ?? Number.NEGATIVE_INFINITY) &&
        submitted <= (question.config.numberMaximum ?? Number.POSITIVE_INFINITY)
      );
    }
    return Math.abs(submitted - (question.config.numberAnswer ?? 0)) <= (question.config.tolerance ?? 0);
  }

  if (question.type === "ORDER") {
    const correctOrder = question.config.correctOrder ?? question.options
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((option) => option.id);
    return JSON.stringify(answer.order ?? []) === JSON.stringify(correctOrder);
  }

  if (question.type === "MATCHING") {
    const correctMatches = question.config.correctMatches ?? Object.fromEntries(
      question.options.map((option) => [option.id, option.matchWith ?? ""]),
    );
    return Object.entries(correctMatches).every(([key, value]) => answer.matches?.[key] === value);
  }

  return false;
}

export function toPublicTriviaQuestion(question: TriviaQuestion): PublicTriviaQuestion {
  return {
    ...question,
    options: question.options.map((option) => ({ id: option.id, text: option.text, imageUrl: option.imageUrl, emoji: option.emoji })),
    config: {
      scaleMinimum: question.config.scaleMinimum,
      scaleMaximum: question.config.scaleMaximum,
      scaleStep: question.config.scaleStep,
      scaleMinimumLabel: question.config.scaleMinimumLabel,
      scaleMaximumLabel: question.config.scaleMaximumLabel,
      allowAnswerChanges: question.config.allowAnswerChanges,
    },
  };
}

export function getTriviaReveal(question: TriviaQuestion) {
  return {
    correctOptionIds: question.options.filter((option) => option.correct).map((option) => option.id),
    acceptedAnswers: question.config.acceptedAnswers,
    numberAnswer: question.config.numberAnswer,
    numberMinimum: question.config.numberMinimum,
    numberMaximum: question.config.numberMaximum,
    correctOrder: question.config.correctOrder,
    correctMatches: question.config.correctMatches,
    explanation: question.explanation,
  };
}
