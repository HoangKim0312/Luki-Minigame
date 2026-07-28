"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { authApi, Session, useAuth } from "../auth-provider";

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const session = await authApi<Session>(mode === "login" ? "/api/auth/login" : "/api/auth/register", {
        method: "POST",
        body: JSON.stringify(mode === "login" ? { email, password } : { email, password, displayName }),
      });
      signIn(session);
      router.push("/collection");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể đăng nhập.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-section top-section legal-page">
      <div className="page-intro">
        <p className="kicker"><span /> Restorer identity</p>
        <h1>{mode === "login" ? "Đăng nhập" : "Tạo tài khoản"}<br /><em>Archive</em></h1>
        <p>Tiến trình, fragment và collection được lưu an toàn bằng Supabase Auth.</p>
      </div>
      <form className="report-form" onSubmit={submit}>
        {mode === "register" && <label>Tên hiển thị<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={40} /></label>}
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
        <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
        {error && <p className="admin-notice">{error}</p>}
        <button className="button primary" disabled={loading}>{loading ? "Đang kết nối..." : mode === "login" ? "Đăng nhập →" : "Đăng ký →"}</button>
        <button className="button ghost" type="button" onClick={() => setMode((value) => value === "login" ? "register" : "login")}>
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}
        </button>
        <Link className="text-link" href="/">Tiếp tục với tư cách Guest</Link>
      </form>
    </section>
  );
}
