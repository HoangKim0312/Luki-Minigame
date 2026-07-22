import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { TriviaQuiz } from "../lib/trivia";
import { starterTriviaQuizzes } from "../lib/trivia-seeds";
import { isSupabaseConfigured, supabaseRest } from "./supabase";

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

  async list(): Promise<TriviaQuiz[]> {
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

type QuizRow = {
  id: string; owner_id: string | null; title: string; description: string; cover_emoji: string;
  cover_image: string | null; category: string; language: string; visibility: string;
  creator_name: string; play_count: number; settings: TriviaQuiz["settings"];
  created_at: string; updated_at: string;
};
type QuestionRow = {
  id: string; quiz_id: string; position: number; type: TriviaQuiz["questions"][number]["type"];
  prompt: string; description: string | null; config: TriviaQuiz["questions"][number]["config"];
  media: TriviaQuiz["questions"][number]["media"] | null; time_limit_seconds: number;
  scoring_mode: TriviaQuiz["questions"][number]["scoringMode"]; explanation: string | null;
  difficulty: TriviaQuiz["questions"][number]["difficulty"]; category: string | null; tags: string[];
};
type OptionRow = {
  id: string; question_id: string; position: number; text: string | null; image_url: string | null;
  emoji: string | null; is_correct: boolean; order_index: number | null; match_with: string | null;
};

function encodeFilter(value: string) {
  return encodeURIComponent(value);
}

export class SupabaseTriviaQuizRepository implements TriviaQuizRepository {
  private hydrate(quiz: QuizRow, questions: QuestionRow[], options: OptionRow[]): TriviaQuiz {
    return {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      coverEmoji: quiz.cover_emoji,
      coverImage: quiz.cover_image ?? undefined,
      category: quiz.category,
      language: quiz.language,
      visibility: quiz.visibility.toUpperCase() as TriviaQuiz["visibility"],
      creator: quiz.creator_name,
      creatorId: quiz.owner_id ?? undefined,
      plays: Number(quiz.play_count),
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at,
      settings: quiz.settings,
      questions: questions.filter(question => question.quiz_id === quiz.id).sort((a, b) => a.position - b.position).map(question => ({
        id: question.id,
        type: question.type,
        prompt: question.prompt,
        description: question.description ?? undefined,
        config: question.config,
        media: question.media ?? undefined,
        timeLimitSeconds: question.time_limit_seconds,
        scoringMode: question.scoring_mode,
        explanation: question.explanation ?? undefined,
        difficulty: question.difficulty,
        category: question.category ?? undefined,
        tags: question.tags,
        options: options.filter(option => option.question_id === question.id).sort((a, b) => a.position - b.position).map(option => ({
          id: option.id,
          text: option.text ?? undefined,
          imageUrl: option.image_url ?? undefined,
          emoji: option.emoji ?? undefined,
          correct: option.is_correct,
          order: option.order_index ?? undefined,
          matchWith: option.match_with ?? undefined,
        })),
      })),
    };
  }

  private async loadRelations(quizzes: QuizRow[]) {
    if (!quizzes.length) return [];
    const quizIds = quizzes.map(quiz => `"${quiz.id.replaceAll('"', '')}"`).join(",");
    const questions = await supabaseRest<QuestionRow[]>(`trivia_questions?quiz_id=in.(${encodeFilter(quizIds)})&select=*&order=position.asc`);
    const questionIds = questions.map(question => `"${question.id.replaceAll('"', '')}"`).join(",");
    const options = questionIds ? await supabaseRest<OptionRow[]>(`trivia_question_options?question_id=in.(${encodeFilter(questionIds)})&select=*&order=position.asc`) : [];
    return quizzes.map(quiz => this.hydrate(quiz, questions, options));
  }

  async list(): Promise<TriviaQuiz[]> {
    const rows = await supabaseRest<QuizRow[]>("trivia_quizzes?select=*&order=play_count.desc,updated_at.desc");
    if (!rows.length) {
      for (const quiz of starterTriviaQuizzes) await this.save(quiz);
      return this.list();
    }
    return this.loadRelations(rows);
  }

  async get(id: string) {
    const rows = await supabaseRest<QuizRow[]>(`trivia_quizzes?id=eq.${encodeFilter(id)}&select=*&limit=1`);
    if (!rows.length) {
      const seed = starterTriviaQuizzes.find(quiz => quiz.id === id);
      return seed ? this.save(seed) : undefined;
    }
    return (await this.loadRelations(rows))[0];
  }

  async save(quiz: TriviaQuiz) {
    const now = new Date().toISOString();
    const row = {
      id: quiz.id, owner_id: quiz.creatorId ?? null, title: quiz.title, description: quiz.description,
      cover_emoji: quiz.coverEmoji, cover_image: quiz.coverImage ?? null, category: quiz.category,
      language: quiz.language, visibility: quiz.visibility.toLowerCase(), creator_name: quiz.creator,
      play_count: quiz.plays, settings: quiz.settings, created_at: quiz.createdAt || now, updated_at: now,
    };
    await supabaseRest("trivia_quizzes?on_conflict=id", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify(row) });
    await supabaseRest(`trivia_questions?quiz_id=eq.${encodeFilter(quiz.id)}`, { method: "DELETE" });
    const questionRows = quiz.questions.map((question, position) => ({
      id: question.id, quiz_id: quiz.id, position, type: question.type, prompt: question.prompt,
      description: question.description ?? null, config: question.config, media: question.media ?? null,
      time_limit_seconds: question.timeLimitSeconds, scoring_mode: question.scoringMode,
      explanation: question.explanation ?? null, difficulty: question.difficulty,
      category: question.category ?? null, tags: question.tags,
    }));
    if (questionRows.length) await supabaseRest("trivia_questions", { method: "POST", body: JSON.stringify(questionRows) });
    const optionRows = quiz.questions.flatMap(question => question.options.map((option, position) => ({
      id: option.id, question_id: question.id, position, text: option.text ?? null,
      image_url: option.imageUrl ?? null, emoji: option.emoji ?? null, is_correct: option.correct ?? false,
      order_index: option.order ?? null, match_with: option.matchWith ?? null,
    })));
    if (optionRows.length) await supabaseRest("trivia_question_options", { method: "POST", body: JSON.stringify(optionRows) });
    return { ...quiz, updatedAt: now };
  }

  async remove(id: string) {
    const deleted = await supabaseRest<QuizRow[]>(`trivia_quizzes?id=eq.${encodeFilter(id)}&select=*`, { method: "DELETE", headers: { Prefer: "return=representation" } });
    return deleted.length > 0;
  }
}

export function createTriviaQuizRepository(): TriviaQuizRepository {
  return isSupabaseConfigured() ? new SupabaseTriviaQuizRepository() : new JsonTriviaQuizRepository();
}
