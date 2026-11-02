import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";
import { GlowPointer } from "@/components/glow-pointer";

const headingFont = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.AUTH_URL || "https://smm.tayyorr.uz"),
  title: {
    default: "tayyorr+ — tayyorr.uz xizmatlari markazi",
    template: "%s — tayyorr+",
  },
  description:
    "tayyorr+ — tayyorr.uz hisobingiz va hamyoningiz bilan qo'shimcha xizmatlar: Tayyorr SMM (obunachi, layk, ko'rishlar) va boshqalar.",
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={headingFont.variable}>
      <body className="min-h-dvh antialiased">
        <GlowPointer />
        {children}
      </body>
    </html>
  );
}
