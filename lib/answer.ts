export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[’'".,:;!?()[\]{}_\-/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isAcceptedAnswer(input: string, answers: string[]): boolean {
  const normalized = normalizeAnswer(input);
  if (!normalized) return false;
  return answers.some((answer) => normalizeAnswer(answer) === normalized);
}

