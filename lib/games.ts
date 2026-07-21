import type { Locale } from "../app/i18n-provider";

export type GameKind = "match" | "guess-author" | "number" | "prompt";

export type GameDefinition = {
  id: string;
  icon: string;
  name: Record<Locale, string>;
  description: Record<Locale, string>;
  kind: GameKind;
  minPlayers: number;
  maxPlayers: number;
  minutes: string;
  tone: "lime" | "violet" | "coral" | "sky";
  published: boolean;
  aiEnabled: boolean;
  topic: string;
  questions: Record<Locale, string[]>;
};

export const defaultGames: GameDefinition[] = [
  {
    id: "wavelength", icon: "≈", kind: "match", minPlayers: 2, maxPlayers: 8, minutes: "10–15", tone: "lime", published: true, aiEnabled: true, topic: "Bạn bè, đời sống và những lựa chọn vui",
    name: { vi: "Chung Tần Số", en: "Same Wavelength" },
    description: { vi: "Cùng trả lời một câu hỏi. Càng nhiều đáp án trùng nhau, cả nhóm càng nhiều điểm.", en: "Answer the same prompt. Matching answers earn points for everyone." },
    questions: {
      vi: ["Kể tên một món ăn mà hầu như ai cũng thích.", "Điều gì mọi người thường quên trước khi đi du lịch?", "Một lý do nghe hợp lý để đến muộn là gì?", "Thứ đầu tiên bạn mua nếu trúng số là gì?"],
      en: ["Name a food that almost everyone likes.", "What do people often forget before travelling?", "What is a believable reason for being late?", "What would you buy first after winning the lottery?"],
    },
  },
  {
    id: "who-said-it", icon: "?", kind: "guess-author", minPlayers: 3, maxPlayers: 10, minutes: "15–25", tone: "coral", published: true, aiEnabled: true, topic: "Kỷ niệm, tính cách và những tình huống hài hước",
    name: { vi: "Ai Đã Nói?", en: "Who Said It?" },
    description: { vi: "Mỗi người viết một đáp án bí mật, sau đó cả bàn đoán chủ nhân của từng lá bài.", en: "Write secret answers, then let the table guess who wrote each card." },
    questions: {
      vi: ["Một thói quen kỳ lạ bạn vẫn làm khi không ai nhìn thấy?", "Nếu đổi nghề trong một ngày, bạn sẽ làm gì?", "Món đồ vô dụng nhất bạn từng mua là gì?"],
      en: ["What odd habit do you have when nobody is watching?", "If you changed careers for one day, what would you do?", "What is the most useless thing you have bought?"],
    },
  },
  {
    id: "number", icon: "37", kind: "number", minPlayers: 2, maxPlayers: 8, minutes: "12–20", tone: "violet", published: true, aiEnabled: true, topic: "Ước lượng vui từ 1 đến 100",
    name: { vi: "Nghĩ Quanh Con Số", en: "Think Around the Number" },
    description: { vi: "Cùng đưa ra một con số từ 1–100 cho tình huống và xem cả bàn gần nhau đến đâu.", en: "Pick a number from 1–100 for a situation and see how close the table gets." },
    questions: {
      vi: ["Mức độ đáng sợ khi điện thoại còn 2% pin, từ 1–100?", "Một buổi hẹn hoàn hảo cần bao nhiêu điểm trên 100?", "Khả năng bạn ngủ tiếp sau khi tắt báo thức, từ 1–100?"],
      en: ["How scary is a phone at 2% battery, from 1–100?", "How perfect should a great date be, out of 100?", "How likely are you to sleep after dismissing an alarm, from 1–100?"],
    },
  },
  {
    id: "hot-take", icon: "✦", kind: "prompt", minPlayers: 2, maxPlayers: 12, minutes: "10–20", tone: "sky", published: true, aiEnabled: true, topic: "Quan điểm vui, không gây tranh cãi nặng",
    name: { vi: "Ý Kiến Nóng", en: "Hot Takes" },
    description: { vi: "Lật từng quan điểm, chọn đồng ý hoặc không và kể câu chuyện đằng sau lựa chọn.", en: "Reveal a take, choose a side, and tell the story behind your choice." },
    questions: {
      vi: ["Dứa hoàn toàn thuộc về pizza.", "Đi ngủ sớm thú vị hơn đi tiệc khuya.", "Tin nhắn thoại tốt hơn tin nhắn chữ."],
      en: ["Pineapple absolutely belongs on pizza.", "Going to bed early beats staying out late.", "Voice notes are better than text messages."],
    },
  },
];

export function readLocalGames(): GameDefinition[] {
  if (typeof window === "undefined") return defaultGames;
  try {
    const saved = window.localStorage.getItem("luki-games");
    return saved ? JSON.parse(saved) as GameDefinition[] : defaultGames;
  } catch {
    return defaultGames;
  }
}

export function writeLocalGames(games: GameDefinition[]) {
  window.localStorage.setItem("luki-games", JSON.stringify(games));
  window.dispatchEvent(new Event("luki-games-update"));
}
