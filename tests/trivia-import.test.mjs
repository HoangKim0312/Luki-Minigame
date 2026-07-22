import assert from "node:assert/strict";
import test from "node:test";
import readXlsxFile from "read-excel-file/node";
import { tsImport } from "tsx/esm/api";

const { parseTriviaSpreadsheet } = await tsImport("../lib/trivia-import.ts", import.meta.url);
const headers = ["type", "question", "answer_1", "answer_2", "answer_3", "answer_4", "answer_5", "answer_6", "correct_answers", "explanation", "difficulty", "time_seconds", "category", "tags"];

test("parses supported Excel quiz rows into playable questions", () => {
  const questions = parseTriviaSpreadsheet([
    headers,
    ["SINGLE_CHOICE", "Thủ đô Việt Nam là gì?", "Hà Nội", "Huế", "Đà Nẵng", "Sài Gòn", "", "", "1", "Hà Nội là thủ đô.", "EASY", 20, "Việt Nam", "địa lý,việt nam"],
    ["TEXT_INPUT", "Thủ đô Việt Nam?", "", "", "", "", "", "", "Hà Nội|Ha Noi", "Chấp nhận hai cách viết.", "MEDIUM", 30, "Việt Nam", "địa lý"],
    ["ORDER", "Xếp theo thứ tự đúng", "Một", "Hai", "Ba", "", "", "", "", "Theo thứ tự tăng dần.", "HARD", 45, "", ""],
  ]);
  assert.equal(questions.length, 3);
  assert.equal(questions[0].options.filter(option => option.correct).length, 1);
  assert.deepEqual(questions[1].config.acceptedAnswers, ["Hà Nội", "Ha Noi"]);
  assert.deepEqual(questions[2].config.correctOrder, questions[2].options.map(option => option.id));
});

test("rejects the entire Excel import when any row is invalid", () => {
  assert.throws(() => parseTriviaSpreadsheet([
    headers,
    ["MULTIPLE_CHOICE", "Câu hỏi bị lỗi", "A", "B", "C", "", "", "", "1,2,3", "", "MEDIUM", 20, "", ""],
  ]), /ít nhất 1 đáp án đúng và 1 đáp án sai/);
});

test("the downloadable Excel template can be read by the browser importer", async () => {
  const rows = await readXlsxFile(new URL("../public/templates/luki-quiz-import-template.xlsx", import.meta.url), { sheet: "Cau hoi" });
  const questions = parseTriviaSpreadsheet(rows);
  assert.equal(questions.length, 5);
  assert.deepEqual(questions.map(question => question.type), ["SINGLE_CHOICE", "MULTIPLE_CHOICE", "TRUE_FALSE", "TEXT_INPUT", "ORDER"]);
});
