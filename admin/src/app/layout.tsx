import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import localFont from "next/font/local";

import "./globals.css";
import { Providers } from "@/components/providers";

// shrift loyihaning o'zida — build Google Fonts'ga bog'liq bo'lmasin
const headingFont = localFont({
  src: "../fonts/SpaceGrotesk.woff2",
  weight: "500 700",
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "tayyorr admin", template: "%s — tayyorr admin" },
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.png", apple: "/apple-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#08080d",
  colorScheme: "dark light",
};

/** admin.tayyorr.uz — alohida loyiha (tayyorr.uz bilan umumiy baza). */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const light = (await cookies()).get("tyr_theme")?.value === "light";
  return (
    <html lang="uz" className={[light ? "light" : "", headingFont.variable].filter(Boolean).join(" ")}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{document.documentElement.classList.add('js-reveal');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
