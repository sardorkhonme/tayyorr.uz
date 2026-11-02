import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";

import "./globals.css";
import { SITE_URL } from "@/lib/links";

// shriftlar loyihaning o'zida — build Google Fonts'ga bog'liq bo'lmasin
const heading = localFont({ src: "../fonts/SpaceGrotesk.woff2", weight: "500 700", variable: "--font-heading", display: "swap" });
const body = localFont({ src: "../fonts/Inter.woff2", weight: "400 700", variable: "--font-body", display: "swap" });

const TITLE = "Tayyorr.uz — ilmiy ishlar, SMM va boshqa xizmatlar bitta hisobda";
const DESCRIPTION =
  "Prezentatsiya, kurs ishi, referat va diplom ishi uchun ishonchli tayyorlovchi toping; Instagram, Telegram, TikTok uchun obunachi va layklar. Bitta hisob, bitta hamyon.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: "%s — Tayyorr.uz" },
  description: DESCRIPTION,
  applicationName: "Tayyorr.uz",
  keywords: [
    "prezentatsiya tayyorlash",
    "kurs ishi",
    "referat",
    "diplom ishi",
    "mustaqil ish",
    "smm panel",
    "instagram obunachi",
    "telegram obunachi",
    "tayyorr",
    "tayyorr.uz",
  ],
  alternates: { canonical: "/" },
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Tayyorr.uz",
    title: TITLE,
    description: DESCRIPTION,
    locale: "uz_UZ",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/og.png"] },
  verification: { google: "cn2c3fohiFjMAQjoBh_bpX60G_9uMLvDxFveVN0K2QU" },
};

export const viewport: Viewport = { themeColor: "#06060b", colorScheme: "dark" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                { "@type": "Organization", "@id": `${SITE_URL}/#organization`, name: "Tayyorr.uz", url: SITE_URL, logo: `${SITE_URL}/icon.png` },
                { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: "Tayyorr.uz", description: DESCRIPTION, inLanguage: "uz", publisher: { "@id": `${SITE_URL}/#organization` } },
              ],
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}
