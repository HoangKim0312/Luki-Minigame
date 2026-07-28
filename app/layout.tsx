import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import { SiteShell } from "./components/site-shell";
import "./globals.css";

const title = "AniGame Archive — Guess. Restore. Collect.";
const description = "Chơi mini-game anime và game, phục hồi collectible, hoàn thành album và tranh hạng mỗi ngày.";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  return {
    metadataBase: new URL(origin),
    title,
    description,
    applicationName: "AniGame Archive",
    openGraph: { title, description, type: "website", locale: "vi_VN", images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "AniGame Archive — Guess. Restore. Collect." }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export const viewport: Viewport = { themeColor: "#090c18", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><SiteShell>{children}</SiteShell></body></html>;
}
