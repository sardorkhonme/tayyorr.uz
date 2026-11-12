import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { PlatformTransition } from "@/components/platform-transition";
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

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={headingFont.variable} suppressHydrationWarning>
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
