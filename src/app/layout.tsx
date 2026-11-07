import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Space_Grotesk } from "next/font/google";

import "./globals.css";
import { PlatformTransition } from "@/components/platform-transition";
import { Providers } from "@/components/providers";
import { ActivityTracker } from "@/components/activity-tracker";

// sarlavhalar uchun asosiy (display) shrift — geometrik, lekin haddan
// tashqari o'yinqaro (Baloo) ham, haddan tashqari qat'iy (Orbitron) ham emas
const headingFont = Space_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  variable: "--font-heading",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
const TITLE = "tayyorr.uz — prezentatsiya, kurs işi va referat buyurtma qiliş";
const DESCRIPTION =
  "tayyorr.uz — talabalar uçun platforma: prezentatsiya, kurs işi, referat, esse va diplom işini işonçli tayyorlovçilarga buyurtma qiling yoki özingiz tayyorlab daromad qiling. Xavfsiz tölov, kelişuv va baholaş tizimi. Tayyorr SMM — obunaçi, layk va körişlar. Bitta hisob va bitta hamyon.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s — tayyorr.uz",
  },
  description: DESCRIPTION,
  applicationName: "tayyorr.uz",
  keywords: [
    "prezentatsiya tayyorlaş",
    "kurs işi",
    "referat",
    "esse",
    "diplom işi",
    "mustaqil iş",
    "slayd tayyorlaş",
    "talabalar uçun",
    "buyurtma qiliş",
    "tayyorr",
    "tayyorr.uz",
    "smm panel",
    "instagram obunaçi",
    "telegram obunaçi",
    "Özbekiston",
    // eski yozuvda ham qidiriladi (2026-yilgi alifbogacha bo'lgan imlo) — Google uchun
    "prezentatsiya tayyorlaş",
    "kurs işi",
    "diplom işi",
    "mustaqil iş",
    "slayd tayyorlaş",
    "talabalar uçun",
    "buyurtma qiliş",
    "instagram obunaçi",
    "telegram obunaçi",
    "Özbekiston",
  ],
  authors: [{ name: "tayyorr.uz" }],
  creator: "tayyorr.uz",
  publisher: "tayyorr.uz",
  category: "education",
  verification: {
    google: "cn2c3fohiFjMAQjoBh_bpX60G_9uMLvDxFveVN0K2QU",
  },
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    type: "website",
    locale: "uz_UZ",
    url: SITE_URL,
    siteName: "tayyorr.uz",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "tayyorr.uz — prezentatsiya, kurs işi va referat buyurtma qiliş",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#07070c",
  colorScheme: "dark light",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const light = (await cookies()).get("tyr_theme")?.value === "light";

  return (
    <html
      lang="uz"
      suppressHydrationWarning
      className={[light ? "light" : "", headingFont.variable].filter(Boolean).join(" ")}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            // landing / login / register — har doim qorong'i
            __html: `(function(){try{var p=location.pathname;if(p==='/'||p.indexOf('/login')===0||p.indexOf('/register')===0)document.documentElement.classList.remove('light');document.documentElement.classList.add('js-reveal');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": `${SITE_URL}/#organization`,
                  name: "tayyorr.uz",
                  url: SITE_URL,
                  logo: `${SITE_URL}/icon.png`,
                },
                {
                  "@type": "WebSite",
                  "@id": `${SITE_URL}/#website`,
                  url: SITE_URL,
                  name: "tayyorr.uz",
                  description: DESCRIPTION,
                  inLanguage: "uz",
                  publisher: { "@id": `${SITE_URL}/#organization` },
                },
              ],
            }),
          }}
        />
        <Providers>{children}</Providers>
        <PlatformTransition theme="auto" />
        <ActivityTracker />
      </body>
    </html>
  );
}
