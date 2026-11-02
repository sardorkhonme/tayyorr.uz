import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://smm.tayyorr.uz"),
  title: {
    default: "TayyorrSMM — Instagram, Telegram, TikTok uchun SMM xizmatlari",
    template: "%s — TayyorrSMM",
  },
  description:
    "TayyorrSMM — obunachi, layk, ko'rishlar va boshqa SMM xizmatlari. tayyorr.uz hisobingiz va hamyoningiz bilan bir zumda buyurtma bering.",
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#08080d" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={headingFont.variable}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
