import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import { AuthProvider } from "./auth-provider";
import { SiteShell } from "./components/site-shell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "AniGame Archive — Guess. Restore. Collect.";
const description = "Chơi mini-game anime và game, phục hồi collectible, hoàn thành album và tranh hạng mỗi ngày.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "AniGame Archive",
  openGraph: { title, description, type: "website", locale: "vi_VN", images: [{ url: `${siteUrl}/og.png`, width: 1731, height: 909, alt: title }] },
  twitter: { card: "summary_large_image", title, description, images: [`${siteUrl}/og.png`] },
};

export const viewport: Viewport = { themeColor: "#090c18", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><AuthProvider><SiteShell>{children}</SiteShell></AuthProvider></body></html>;
}
