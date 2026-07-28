"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../auth-provider";

const nav = [
  ["/room", "Phòng chơi"],
  ["/explore", "Khám phá"],
  ["/play", "Thử thách"],
  ["/daily", "Daily"],
  ["/collection", "Collection"],
  ["/leaderboard", "Xếp hạng"],
];

export function SiteShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session, status, signOut } = useAuth();
  return (
    <div className="archive-shell">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="AniGame Archive">
          <span className="brand-mark">A</span>
          <span>ANIGAME <b>ARCHIVE</b></span>
        </Link>
        <nav className={menuOpen ? "main-nav open" : "main-nav"} aria-label="Điều hướng chính">
          {nav.map(([href, label]) => <Link key={href} className={pathname === href ? "active" : ""} href={href} onClick={() => setMenuOpen(false)}>{label}</Link>)}
        </nav>
        <div className="header-actions">
          {status === "authenticated" && session ? (
            <Link href="/profile/restorer" title="Mở profile">
              {session.user.name.slice(0, 2).toUpperCase()} <span>{session.user.archiveScore ?? 0} pts</span>
            </Link>
          ) : (
            <Link href="/login">Đăng nhập <span>Supabase</span></Link>
          )}
          {session && <button className="signout-button" type="button" onClick={signOut}>Thoát</button>}
          <button className="menu-toggle" type="button" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-label="Mở menu">☰</button>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div><span className="brand-mark small">A</span><b>AniGame Archive</b></div>
        <p>Dữ liệu hiển thị từ remote source. Media chỉ phát khi nguồn và quyền sử dụng cho phép.</p>
        <nav><Link href="/copyright">Copyright</Link><Link href="/report-content">Báo cáo nội dung</Link><Link href="/admin">Admin</Link></nav>
      </footer>
    </div>
  );
}
