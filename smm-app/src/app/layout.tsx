import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { PlatformTransition } from "@/components/platform-transition";
import { SiteFooter } from "@/components/site-footer";
import { SmmHeader, type HeaderUser } from "@/components/smm-header";
import { SupportWidget } from "@/components/support-widget";
import { currentUser } from "@/lib/session";
import { THEME_COOKIE, THEME_INIT_SCRIPT } from "@/lib/theme";
import { PushPrompt } from "@/components/push-prompt";
import { ActivityTracker } from "@/components/activity-tracker";

// shrift loyihaning o'zida — build Google Fonts'ga bog'liq bo'lmasin
const headingFont = localFont({
  src: "../fonts/SpaceGrotesk.woff2",
  weight: "500 700",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz"),
  title: { default: "Tayyorr SMM — obunaçi, layk va körişlar", template: "%s — Tayyorr SMM" },
  description:
    "Tayyorr SMM: Instagram, Telegram, TikTok va YouTube uçun obunaçi, layk va körişlar — avtomatik, bajarilmasa pul qaytadi. tayyorr+ hisobi bilan.",
  // eski yozuvda ham qidiriladi (2026-yilgi alifbogacha bo'lgan imlo) — Google uchun
  keywords: ["smm panel", "instagram obunaçi", "telegram obunaçi", "tiktok körişlar", "arzon obunaçi", "layk", "körişlar", "Tayyorr SMM"],
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export async function generateViewport(): Promise<Viewport> {
  const t = (await cookies()).get(THEME_COOKIE)?.value;
  if (t === "dark") return { themeColor: "#0c0c11" };
  if (t === "light") return { themeColor: "#f5f5f9" };
  return {
    themeColor: [
      { media: "(prefers-color-scheme: dark)", color: "#0c0c11" },
      { media: "(prefers-color-scheme: light)", color: "#f5f5f9" },
    ],
  };
}

/** smm.tayyorr.uz — Tayyorr SMM xizmati (alohida loyiha; hisob va hamyon tayyorr+ bilan umumiy). */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [u, jar] = await Promise.all([currentUser(), cookies()]);
  const theme = jar.get(THEME_COOKIE)?.value;
  const user: HeaderUser = u
    ? { name: u.firstName || u.name || u.login || "Foydalanuvçi", image: u.avatarUrl || u.image, balance: u.balance }
    : null;
  return (
    <html lang="uz" className={[headingFont.variable, theme === "dark" ? "dark" : ""].filter(Boolean).join(" ")} suppressHydrationWarning>
      <head>
        {/* tanlov bölmasa — qurilma mavzusi (birinçi çiziliştan oldin, miltillamasin) */}
        {!theme && <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />}
      </head>
      <body className="min-h-dvh antialiased">
        <GlowPointer />
        <SmmHeader user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
          {children}
          <SiteFooter />
        </main>
        <SupportWidget loggedIn={!!u} />
        {u && <PushPrompt />}
        <PlatformTransition />
        <ActivityTracker />
      </body>
    </html>
  );
}
