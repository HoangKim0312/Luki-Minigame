"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Locale = "vi" | "en";

const messages = {
  vi: {
    navGames: "Kho trò chơi",
    navHow: "Cách chơi",
    navJoin: "Vào phòng",
    createRoom: "Tạo phòng mới",
    eyebrow: "Minigame cho những cuộc gọi dài hơn dự tính",
    heroA: "Ít ngại ngùng.",
    heroB: "Nhiều chuyện để nói.",
    heroText: "Một căn phòng nhỏ cho hội bạn lớn chuyện. Không cần cài đặt, vào bằng mã phòng và chơi ngay bằng giọng nói hoặc chat.",
    roomCode: "Mã phòng",
    roomCodePlaceholder: "VD: LUKI42",
    joinNow: "Vào chơi",
    createInstead: "hoặc tự mở một phòng",
    liveRoom: "Phòng đang mở",
    friendsOnline: "bạn đang trực tuyến",
    stepOne: "Mở phòng",
    stepOneText: "Chọn game và cách cả nhóm trò chuyện.",
    stepTwo: "Mời hội bạn",
    stepTwoText: "Gửi mã 6 ký tự — không cần tài khoản.",
    stepThree: "Bắt đầu chơi",
    stepThreeText: "Luki lo lượt, đồng hồ và điểm số.",
    madeFor: "Được làm cho khoảnh khắc",
    whenTalks: "khi cả nhóm chưa biết nói gì.",
    gameWavelength: "Chung Tần Số",
    gameWavelengthText: "Cùng trả lời một câu hỏi. Câu trả lời trùng nhau càng nhiều, điểm càng cao.",
    gameNumber: "Nghĩ Quanh Con Số",
    gameNumberText: "Đoán con số bí mật bằng những câu hỏi vòng vo — tuyệt đối không hỏi thẳng.",
    gameWho: "Ai Đã Nói?",
    gameWhoText: "Đọc câu trả lời ẩn danh và đoán xem người bạn nào đã viết nó.",
    playable: "Chơi được",
    soon: "Sắp ra mắt",
    seeGames: "Xem tất cả trò chơi",
    footer: "Tạo ra tại Việt Nam, cho mọi hội bạn.",
    joinTitle: "Hội bạn đang đợi.",
    joinText: "Nhập tên và mã phòng bạn nhận được.",
    displayName: "Tên hiển thị",
    namePlaceholder: "Bạn muốn được gọi là gì?",
    enterRoom: "Vào phòng",
    noCode: "Chưa có mã?",
    createOne: "Tạo phòng của bạn",
    createTitle: "Tạo cuộc vui của riêng bạn.",
    createText: "Thiết lập nhanh trong chưa đầy một phút.",
    chooseGame: "Chọn trò chơi",
    communication: "Cách trò chuyện",
    externalVoice: "Gọi ngoài (Discord, Meet…)",
    textChat: "Chat chữ",
    builtInVoice: "Voice trong Luki",
    rounds: "Số vòng",
    questionLanguage: "Ngôn ngữ câu hỏi",
    openRoom: "Mở phòng",
    vietnamese: "Tiếng Việt",
    english: "English",
    catalogueTitle: "Một game cho mọi kiểu hội.",
    catalogueText: "Bắt đầu với game nhẹ nhàng, rồi để câu chuyện tự đi xa.",
    players: "người",
    mins: "phút",
    privateRoom: "Phòng riêng",
    copyCode: "Sao chép mã",
    copied: "Đã sao chép",
    waitingRoom: "Sảnh chờ",
    roomNotFound: "Chưa tìm thấy phòng này trên thiết bị.",
    roomNotFoundText: "Hãy tạo phòng mới hoặc mở link trên cùng trình duyệt đã tạo phòng.",
    backHome: "Về trang chủ",
    host: "Chủ phòng",
    ready: "Sẵn sàng",
    notReady: "Chưa sẵn sàng",
    you: "Bạn",
    addDemo: "Thêm bạn chơi thử",
    demoNote: "Chế độ thử cục bộ",
    demoExplanation: "Phòng được đồng bộ giữa các tab trên thiết bị này. Bản production sẽ dùng máy chủ thời gian thực.",
    startGame: "Bắt đầu game",
    needPlayers: "Cần ít nhất 2 người và mọi người phải sẵn sàng.",
    question: "Câu hỏi vòng",
    submitAnswer: "Gửi câu trả lời",
    answerPlaceholder: "Câu trả lời bí mật của bạn…",
    answered: "Đã trả lời",
    waitingAnswers: "Đang chờ mọi người trả lời…",
    reveal: "Lật đáp án",
    sameAnswer: "Trùng ý!",
    differentAnswer: "Mỗi người một ý",
    nextRound: "Vòng tiếp theo",
    finishGame: "Xem kết quả",
    winner: "Người bắt sóng tốt nhất",
    playAgain: "Chơi lại",
    roundOf: "Vòng {round}/{total}",
    leaveRoom: "Rời phòng",
    modeLabel: "Đang dùng cuộc gọi ngoài",
    invalidCode: "Mã phòng gồm 4–6 chữ hoặc số.",
    requiredName: "Hãy nhập tên của bạn.",
  },
  en: {
    navGames: "Games",
    navHow: "How it works",
    navJoin: "Join room",
    createRoom: "Create a room",
    eyebrow: "Minigames for calls that run longer than planned",
    heroA: "Less awkward.",
    heroB: "More to talk about.",
    heroText: "A small room for friends with big stories. No install needed—join by code and play over voice or text.",
    roomCode: "Room code",
    roomCodePlaceholder: "E.g. LUKI42",
    joinNow: "Join now",
    createInstead: "or open your own room",
    liveRoom: "Room is live",
    friendsOnline: "friends online",
    stepOne: "Open a room",
    stepOneText: "Pick a game and how your group will talk.",
    stepTwo: "Invite friends",
    stepTwoText: "Share a 6-character code—no account needed.",
    stepThree: "Start playing",
    stepThreeText: "Luki handles turns, timers and scores.",
    madeFor: "Made for that moment",
    whenTalks: "when nobody knows what to say.",
    gameWavelength: "Same Wavelength",
    gameWavelengthText: "Answer the same prompt. The more answers match, the more points everyone earns.",
    gameNumber: "Think Around the Number",
    gameNumberText: "Guess a secret number using indirect questions—never ask it outright.",
    gameWho: "Who Said It?",
    gameWhoText: "Read anonymous answers and guess which friend wrote each one.",
    playable: "Playable",
    soon: "Coming soon",
    seeGames: "See all games",
    footer: "Made in Vietnam, for every group of friends.",
    joinTitle: "Your friends are waiting.",
    joinText: "Enter your name and the room code you received.",
    displayName: "Display name",
    namePlaceholder: "What should we call you?",
    enterRoom: "Enter room",
    noCode: "No code yet?",
    createOne: "Create your room",
    createTitle: "Make the fun your own.",
    createText: "Set up a room in under a minute.",
    chooseGame: "Choose a game",
    communication: "Communication",
    externalVoice: "External call (Discord, Meet…)",
    textChat: "Text chat",
    builtInVoice: "Luki voice",
    rounds: "Rounds",
    questionLanguage: "Question language",
    openRoom: "Open room",
    vietnamese: "Tiếng Việt",
    english: "English",
    catalogueTitle: "A game for every kind of group.",
    catalogueText: "Start light, then let the conversation wander.",
    players: "players",
    mins: "min",
    privateRoom: "Private room",
    copyCode: "Copy code",
    copied: "Copied",
    waitingRoom: "Waiting room",
    roomNotFound: "This room isn't on this device yet.",
    roomNotFoundText: "Create a room first, or open the link in the browser where it was created.",
    backHome: "Back home",
    host: "Host",
    ready: "Ready",
    notReady: "Not ready",
    you: "You",
    addDemo: "Add demo friend",
    demoNote: "Local demo mode",
    demoExplanation: "This room syncs across tabs on this device. Production will use a real-time server.",
    startGame: "Start game",
    needPlayers: "At least 2 players are needed and everyone must be ready.",
    question: "Round prompt",
    submitAnswer: "Submit answer",
    answerPlaceholder: "Your secret answer…",
    answered: "Answered",
    waitingAnswers: "Waiting for everyone to answer…",
    reveal: "Reveal answers",
    sameAnswer: "Same wavelength!",
    differentAnswer: "Different minds",
    nextRound: "Next round",
    finishGame: "See results",
    winner: "Best mind-reader",
    playAgain: "Play again",
    roundOf: "Round {round}/{total}",
    leaveRoom: "Leave room",
    modeLabel: "Using an external call",
    invalidCode: "Room code must be 4–6 letters or numbers.",
    requiredName: "Please enter your name.",
  },
} as const;

export type MessageKey = keyof typeof messages.vi;

type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("vi");

  useEffect(() => {
    const saved = window.localStorage.getItem("luki-locale");
    if (saved === "vi" || saved === "en") {
      queueMicrotask(() => setLocaleState(saved));
    }
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("luki-locale", next);
    document.documentElement.lang = next;
  };

  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => {
      let result: string = messages[locale][key];
      Object.entries(vars ?? {}).forEach(([name, value]) => {
        result = result.replace(`{${name}}`, String(value));
      });
      return result;
    },
  }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside I18nProvider");
  return value;
}
