"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getBackendUrl } from "../../lib/backend-url";
import { getEstimatedQuizMinutes, type TriviaQuiz } from "../../lib/trivia";
import { starterTriviaQuizzes } from "../../lib/trivia-seeds";

function QuizCard({ quiz }: { quiz: TriviaQuiz }) {
  return <article className="quiz-card">
    <div className="quiz-cover"><span>{quiz.coverEmoji}</span><i>{quiz.category}</i></div>
    <div className="quiz-card-body">
      <div className="quiz-card-topline"><span>{quiz.visibility === "PUBLIC" ? "🌍 Công khai" : quiz.visibility === "UNLISTED" ? "🔗 Không công khai" : "🔒 Riêng tư"}</span><span>▶ {quiz.plays.toLocaleString("vi-VN")}</span></div>
      <h3>{quiz.title}</h3><p>{quiz.description}</p>
      <div className="quiz-card-meta"><span><b>{quiz.questions.length}</b> câu</span><span>~{getEstimatedQuizMinutes(quiz)} phút</span><span>bởi {quiz.creator}</span></div>
      <div className="quiz-card-actions"><Link className="button trivia-play-button" href={`/create?game=trivia&quiz=${quiz.id}`}>▶ Chơi</Link><Link className="quiz-edit-link" href={`/trivia/builder?id=${quiz.id}`}>Chỉnh sửa</Link></div>
    </div>
  </article>;
}

function LibrarySection({ title, quizzes }: { title: string; quizzes: TriviaQuiz[] }) {
  return <section className="quiz-library-section"><div className="quiz-section-title"><h2>{title}</h2><span>{quizzes.length} bộ</span></div><div className="quiz-card-grid">{quizzes.map(quiz => <QuizCard quiz={quiz} key={quiz.id} />)}</div></section>;
}

export function TriviaLibrary() {
  const [quizzes, setQuizzes] = useState<TriviaQuiz[]>(starterTriviaQuizzes);
  const [status, setStatus] = useState("Đang đồng bộ thư viện…");
  useEffect(() => { fetch(`${getBackendUrl()}/api/trivia/quizzes`).then(response => response.ok ? response.json() : Promise.reject()).then((data: { quizzes: TriviaQuiz[] }) => { setQuizzes(data.quizzes); setStatus(`${data.quizzes.length} bộ câu hỏi sẵn sàng`); }).catch(() => setStatus("Đang dùng thư viện mẫu ngoại tuyến")); }, []);
  const popular = useMemo(() => [...quizzes].sort((a, b) => b.plays - a.plays).slice(0, 4), [quizzes]);
  const mine = quizzes.filter(quiz => quiz.creator === "Bạn");
  return <main className="trivia-library">
    <nav className="trivia-nav"><Link className="trivia-brand" href="/"><span>L</span>LUKI</Link><div><Link href="/games">Minigame</Link><Link className="active" href="/trivia">Trivia</Link><Link href="/play">Vào phòng</Link></div><Link className="button button-small" href="/create">Tạo phòng ↗</Link></nav>
    <header className="trivia-hero"><div><p className="eyebrow"><span /> LUKI TRIVIA</p><h1>Tạo câu hỏi.<br/><em>Khuấy động cuộc vui.</em></h1><p>Chơi cùng bạn bè hoặc tự tạo bộ câu hỏi của riêng bạn — điểm số thưởng cho cả kiến thức lẫn tốc độ.</p><div className="trivia-hero-actions"><Link className="button" href="/trivia/builder">＋ Tạo bộ câu hỏi</Link><Link className="button ai-button" href="/trivia/builder?ai=1">✨ Tạo bằng AI</Link></div><small>{status}</small></div><div className="trivia-hero-art" aria-hidden="true"><span>?</span><b>1000</b><i>🧠</i><em>+847</em></div></header>
    <div className="trivia-library-content">
      <LibrarySection title="🔥 Bộ câu hỏi nổi bật" quizzes={popular}/>
      <LibrarySection title="🕘 Chơi gần đây" quizzes={quizzes.slice(0, 3)}/>
      <LibrarySection title="📚 Bộ câu hỏi của tôi" quizzes={mine.length ? mine : quizzes.slice(0, 2)}/>
      <LibrarySection title="🌍 Bộ câu hỏi cộng đồng" quizzes={quizzes.filter(quiz => quiz.visibility === "PUBLIC")}/>
    </div>
  </main>;
}
