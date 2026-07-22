import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TriviaQuiz } from "../lib/trivia";
import { starterTriviaQuizzes } from "../lib/trivia-seeds";

export interface TriviaQuizRepository {
  list(): Promise<TriviaQuiz[]>;
  get(id: string): Promise<TriviaQuiz | undefined>;
  save(quiz: TriviaQuiz): Promise<TriviaQuiz>;
  remove(id: string): Promise<boolean>;
}

export class JsonTriviaQuizRepository implements TriviaQuizRepository {
  constructor(private readonly filePath = join(process.cwd(), ".local-data", "trivia-quizzes.json")) {}

  private async readAll() {
    try {
      const content = await readFile(this.filePath, "utf8");
      const parsed = JSON.parse(content) as TriviaQuiz[];
      return Array.isArray(parsed) ? parsed : starterTriviaQuizzes;
    } catch {
      await this.writeAll(starterTriviaQuizzes);
      return structuredClone(starterTriviaQuizzes);
    }
  }

  private async writeAll(quizzes: TriviaQuiz[]) {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(quizzes, null, 2), "utf8");
  }

  async list() {
    return this.readAll();
  }

  async get(id: string) {
    return (await this.readAll()).find((quiz) => quiz.id === id);
  }

  async save(quiz: TriviaQuiz) {
    const quizzes = await this.readAll();
    const normalized = { ...quiz, updatedAt: new Date().toISOString() };
    const index = quizzes.findIndex((item) => item.id === quiz.id);
    if (index >= 0) quizzes[index] = normalized;
    else quizzes.unshift(normalized);
    await this.writeAll(quizzes);
    return normalized;
  }

  async remove(id: string) {
    const quizzes = await this.readAll();
    const filtered = quizzes.filter((quiz) => quiz.id !== id);
    if (filtered.length === quizzes.length) return false;
    await this.writeAll(filtered);
    return true;
  }
}
