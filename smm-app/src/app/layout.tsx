import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";
import { SmmHeader, type HeaderUser } from "@/components/smm-header";
import { currentUser } from "@/lib/session";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
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
        <main className="mx-auto w-full max-w-6xl px-4 pb-24 pt-8 sm:px-6 sm:pt-10">{children}</main>
      </body>
    </html>
  );
}
