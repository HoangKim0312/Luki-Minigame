import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import { I18nProvider } from "./i18n-provider";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hoangkim0312.github.io/Luki-Minigame";
const title = "Luki — Chơi gần nhau hơn";
const description = "Nền tảng minigame nhóm bằng Tiếng Việt: tạo phòng, mời bạn bè và bắt đầu cuộc vui.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  openGraph: { title, description, type: "website", locale: "vi_VN", images: [{ url: `${siteUrl}/og.png`, width: 1200, height: 630, alt: "Luki — Ít ngại ngùng. Nhiều chuyện để nói." }] },
  twitter: { card: "summary_large_image", title, description, images: [`${siteUrl}/og.png`] },
};

export const viewport: Viewport = {
  themeColor: "#0b0b13",
  colorScheme: "dark",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
