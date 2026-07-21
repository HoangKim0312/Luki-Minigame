import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Be_Vietnam_Pro, Space_Grotesk } from "next/font/google";
import { I18nProvider } from "./i18n-provider";
import "./globals.css";

const vietnamese = Be_Vietnam_Pro({
  variable: "--font-body",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const display = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const title = "Luki — Chơi gần nhau hơn";
  const description = "Nền tảng minigame nhóm bằng Tiếng Việt: tạo phòng, mời bạn bè và bắt đầu cuộc vui.";
  return {
    title,
    description,
    openGraph: { title, description, type: "website", locale: "vi_VN", images: [{ url: `${origin}/og.png`, width: 1200, height: 630, alt: "Luki — Ít ngại ngùng. Nhiều chuyện để nói." }] },
    twitter: { card: "summary_large_image", title, description, images: [`${origin}/og.png`] },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b0b13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className={`${vietnamese.variable} ${display.variable}`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
