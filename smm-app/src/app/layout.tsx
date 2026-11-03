import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { SiteFooter } from "@/components/site-footer";
import { SmmHeader, type HeaderUser } from "@/components/smm-header";
import { SupportWidget } from "@/components/support-widget";
import { currentUser } from "@/lib/session";

// shrift loyihaning o'zida — build Google Fonts'ga bog'liq bo'lmasin
const headingFont = localFont({
  src: "../fonts/SpaceGrotesk.woff2",
  weight: "500 700",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz"),
  title: { default: "Tayyorr SMM — obunachi, layk va ko'rishlar", template: "%s — Tayyorr SMM" },
  description:
    "Tayyorr SMM: Instagram, Telegram, TikTok va YouTube uchun obunachi, layk va ko'rishlar — avtomatik, bajarilmasa pul qaytadi. tayyorr+ hisobi bilan.",
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

/** smm.tayyorr.uz — Tayyorr SMM xizmati (alohida loyiha; hisob va hamyon tayyorr+ bilan umumiy). */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser();
  const user: HeaderUser = u
    ? { name: u.firstName || u.name || u.login || "Foydalanuvchi", image: u.avatarUrl || u.image, balance: u.balance }
    : null;
  return (
    <html lang="uz" className={headingFont.variable}>
      <body className="min-h-dvh antialiased">
        <GlowPointer />
        <SmmHeader user={user} />
        <main className="mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6 sm:pt-10">
          {children}
          <SiteFooter />
        </main>
        <SupportWidget loggedIn={!!u} />
      </body>
    </html>
  );
}
