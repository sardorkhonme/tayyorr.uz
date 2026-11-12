import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { cookies } from "next/headers";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { PlatformTransition } from "@/components/platform-transition";
import { OfflineOverlay } from "@/components/offline-overlay";
import { ActivityTracker } from "@/components/activity-tracker";
import { currentUser } from "@/auth";
import { resolveTheme, THEME_BG, THEME_COOKIE, themeInitScript } from "@/lib/theme";

// shrift loyihaning o'zida — build Google Fonts'ga bog'liq bo'lmasin
const headingFont = localFont({
  src: "../fonts/SpaceGrotesk.woff2",
  weight: "500 700",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://plus.tayyorr.uz"),
  title: {
    default: "tayyorr+ — tayyorr.uz xizmatlari markazi",
    template: "%s — tayyorr+",
  },
  description:
    "tayyorr+ — tayyorr.uz hisobingiz va hamyoningiz bilan qöşimça xizmatlar: Tayyorr SMM (obunaçi, layk, körişlar) va boşqalar.",
  // eski yozuvda ham qidiriladi (2026-yilgi alifbogacha bo'lgan imlo) — Google uchun
  keywords: ["tayyorr+", "SMM xizmatlari", "obunachi", "körişlar", "hamyon"],
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

/** Mavzu: kirgan bölsa — bazadagi tanlov, aks holda umumiy cookie (.tayyorr.uz); ikkalasi ham bölmasa — qurilma mavzusi. */
async function serverTheme() {
  const [u, jar] = await Promise.all([currentUser().catch(() => null), cookies()]);
  return resolveTheme(u?.theme, jar.get(THEME_COOKIE)?.value);
}

export async function generateViewport(): Promise<Viewport> {
  const t = await serverTheme();
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const theme = await serverTheme();
  return (
    <html lang="uz" className={[headingFont.variable, theme === "dark" ? "dark" : ""].filter(Boolean).join(" ")} suppressHydrationWarning>
      <head>
        {/* birinçi çiziliştan oldin (miltillamasin): tanlov bölmasa — qurilma mavzusi; cookie — umumiy domenga */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(theme) }} />
      </head>
      <body className="min-h-dvh antialiased">
        <GlowPointer />
        {children}
        <PlatformTransition />
        <ActivityTracker />
        <OfflineOverlay />
      </body>
    </html>
  );
}
