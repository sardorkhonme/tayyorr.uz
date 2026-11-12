import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { PlatformTransition } from "@/components/platform-transition";
import { SiteFooter } from "@/components/site-footer";
import { MobileHeader, MobileTabBar } from "@/components/mobile-shell";
import { SmmHeader, type HeaderUser } from "@/components/smm-header";
import { SupportWidget } from "@/components/support-widget";
import { currentUser } from "@/lib/session";
import { resolveTheme, THEME_BG, THEME_COOKIE, themeInitScript } from "@/lib/theme";
import { PushPrompt } from "@/components/push-prompt";
import { OfflineOverlay } from "@/components/offline-overlay";
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
  const [u, jar] = await Promise.all([currentUser(), cookies()]);
  const t = resolveTheme(u?.theme, jar.get(THEME_COOKIE)?.value);
  // viewportFit — iPhone'da pastki panel xavfsiz hudud (home indicator) ustida tursin
  if (t) return { themeColor: THEME_BG[t], viewportFit: "cover" };
  return {
    viewportFit: "cover",
    themeColor: [
      { media: "(prefers-color-scheme: dark)", color: THEME_BG.dark },
      { media: "(prefers-color-scheme: light)", color: THEME_BG.light },
    ],
  };
}

/** smm.tayyorr.uz — Tayyorr SMM xizmati (alohida loyiha; hisob va hamyon tayyorr+ bilan umumiy). */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [u, jar] = await Promise.all([currentUser(), cookies()]);
  // mavzu: kirgan bölsa — bazadagi tanlov, aks holda umumiy cookie (.tayyorr.uz); ikkalasi ham bölmasa — qurilma mavzusi
  const theme = resolveTheme(u?.theme, jar.get(THEME_COOKIE)?.value);
  const user: HeaderUser = u
    ? { name: u.firstName || u.name || u.login || "Foydalanuvçi", image: u.avatarUrl || u.image, balance: u.balance }
    : null;
  return (
    <html lang="uz" className={[headingFont.variable, theme === "dark" ? "dark" : ""].filter(Boolean).join(" ")} suppressHydrationWarning>
      <head>
        {/* birinçi çiziliştan oldin (miltillamasin): tanlov bölmasa — qurilma mavzusi; cookie — umumiy domenga */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(theme) }} />
      </head>
      <body className="min-h-dvh antialiased">
        <GlowPointer />
        <SmmHeader user={user} />
        <MobileHeader />
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-3 sm:px-6 sm:pt-4 lg:pb-0 lg:pt-10">
          {children}
          <SiteFooter />
        </main>
        <MobileTabBar user={user} />
        <SupportWidget loggedIn={!!u} />
        {u && <PushPrompt />}
        <PlatformTransition />
        <ActivityTracker />
        <OfflineOverlay />
      </body>
    </html>
  );
}
