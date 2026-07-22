import { createTriviaQuestion, type TriviaQuestion, type TriviaQuestionType } from "./trivia";

export type SpreadsheetCell = string | number | boolean | Date | null | undefined;

const headers = ["type", "question", "answer_1", "answer_2", "answer_3", "answer_4", "answer_5", "answer_6", "correct_answers", "explanation", "difficulty", "time_seconds", "category", "tags"] as const;
const supportedTypes = new Set<TriviaQuestionType>(["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "TEXT_INPUT", "ORDER"]);
const timers = new Set([5, 10, 15, 20, 30, 45, 60, 90, 120]);

function text(value: SpreadsheetCell) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function rowError(row: number, message: string) {
  return `Dòng ${row}: ${message}`;
}

export function parseTriviaSpreadsheet(rows: SpreadsheetCell[][]): TriviaQuestion[] {
  if (!rows.length) throw new Error("File Excel đang trống.");
  const normalizedHeaders = rows[0].map(value => text(value).toLowerCase());
  const missing = headers.filter(header => !normalizedHeaders.includes(header));
  if (missing.length) throw new Error(`Thiếu cột bắt buộc: ${missing.join(", ")}. Hãy dùng file mẫu Luki.`);
  const column = Object.fromEntries(headers.map(header => [header, normalizedHeaders.indexOf(header)])) as Record<(typeof headers)[number], number>;
  const dataRows = rows.slice(1).map((values, index) => ({ values, row: index + 2 })).filter(({ values }) => values.some(value => text(value)));
  if (!dataRows.length) throw new Error("Sheet “Cau hoi” chưa có câu hỏi nào.");
  if (dataRows.length > 150) throw new Error("Mỗi lần chỉ nhập tối đa 150 câu hỏi.");

  const errors: string[] = [];
  const questions: TriviaQuestion[] = [];
  const prompts = new Set<string>();
  for (const { values, row } of dataRows) {
    try {
      const value = (name: (typeof headers)[number]) => text(values[column[name]]);
      const type = value("type").toUpperCase() as TriviaQuestionType;
      if (!supportedTypes.has(type)) throw new Error("type không hợp lệ.");
      const prompt = value("question");
      if (prompt.length < 3) throw new Error("question phải có ít nhất 3 ký tự.");
      const promptKey = prompt.toLocaleLowerCase();
      if (prompts.has(promptKey)) throw new Error("question bị trùng trong file.");
      prompts.add(promptKey);

      const rawAnswers = (["answer_1", "answer_2", "answer_3", "answer_4", "answer_5", "answer_6"] as const).map(value);
      const firstGap = rawAnswers.findIndex(answer => !answer);
      if (firstGap >= 0 && rawAnswers.slice(firstGap + 1).some(Boolean)) throw new Error("các cột answer phải được nhập liên tục từ answer_1.");
      const answers = rawAnswers.filter(Boolean);
      const question = createTriviaQuestion(type, questions.length);
      question.prompt = prompt;
      question.explanation = value("explanation") || undefined;
      const difficulty = value("difficulty").toUpperCase() || "MEDIUM";
      if (!(["EASY", "MEDIUM", "HARD"] as string[]).includes(difficulty)) throw new Error("difficulty phải là EASY, MEDIUM hoặc HARD.");
      question.difficulty = difficulty as TriviaQuestion["difficulty"];
      const timer = Number(value("time_seconds") || 20);
      if (!timers.has(timer)) throw new Error("time_seconds phải là 5, 10, 15, 20, 30, 45, 60, 90 hoặc 120.");
      question.timeLimitSeconds = timer;
      question.category = value("category") || undefined;
      question.tags = value("tags").split(",").map(tag => tag.trim()).filter(Boolean);

      const correctValue = value("correct_answers");
      if (type === "TEXT_INPUT") {
        const accepted = correctValue.split("|").map(answer => answer.trim()).filter(Boolean);
        if (!accepted.length) throw new Error("TEXT_INPUT cần đáp án trong correct_answers, phân cách bằng |.");
        question.options = [];
        question.config.acceptedAnswers = accepted;
      } else {
        if (answers.length < 2) throw new Error(`${type} cần ít nhất 2 đáp án.`);
        if (type === "TRUE_FALSE" && answers.length !== 2) throw new Error("TRUE_FALSE phải có đúng 2 đáp án.");
        const indexes = correctValue ? correctValue.split(",").map(item => Number(item.trim())) : [];
        if (indexes.some(index => !Number.isInteger(index) || index < 1 || index > answers.length) || new Set(indexes).size !== indexes.length) throw new Error("correct_answers chứa số thứ tự không hợp lệ.");
        if (["SINGLE_CHOICE", "TRUE_FALSE"].includes(type) && indexes.length !== 1) throw new Error(`${type} cần đúng 1 đáp án đúng trong correct_answers.`);
        if (type === "MULTIPLE_CHOICE" && (indexes.length < 1 || indexes.length === answers.length)) throw new Error("MULTIPLE_CHOICE cần ít nhất 1 đáp án đúng và 1 đáp án sai.");
        if (type === "ORDER" && correctValue) throw new Error("ORDER phải để trống correct_answers; các answer đã là thứ tự đúng.");
        question.options = answers.map((answer, index) => ({ id: `${question.id}-option-${index}`, text: answer, correct: type === "ORDER" ? undefined : indexes.includes(index + 1), order: type === "ORDER" ? index : undefined }));
        if (type === "ORDER") question.config.correctOrder = question.options.map(option => option.id);
      }
      questions.push(question);
    } catch (reason) {
      errors.push(rowError(row, reason instanceof Error ? reason.message : "dữ liệu không hợp lệ."));
    }
  }
  if (errors.length) throw new Error(`${errors.slice(0, 8).join("\n")}${errors.length > 8 ? `\n…và ${errors.length - 8} lỗi khác.` : ""}`);
  return questions;
}
