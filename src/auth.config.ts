import type { NextAuthConfig } from "next-auth";
import { NextResponse } from "next/server";
import Google from "next-auth/providers/google";

import { GOOGLE_BIRTHDAY_SCOPE, googleBirthdayEnabled } from "@/lib/birthday-scope";

/**
 * Edge (middleware) uchun xavfsiz konfiguratsiya.
 * Bu yerda Prisma yoki bcrypt ishlatilmaydi.
 */
export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
      // tug'ilgan kun ruxsati faqat Google tasdiqlagach yoqiladi (qara: birthday-scope.ts)
      ...(googleBirthdayEnabled()
        ? { authorization: { params: { scope: `openid email profile ${GOOGLE_BIRTHDAY_SCOPE}` } } }
        : {}),
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request }) {
      const { nextUrl } = request;
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;

      // API route'lar o'z ichida auth() bilan tekshiradi — bu yerda ushlab qolmaymiz
      if (path.startsWith("/api")) return true;
      // admin panel alohida autentifikatsiyaga ega
      if (path.startsWith("/sardorxon")) return true;

      // SEO / statik metadata (robots.txt, sitemap.xml, manifest.webmanifest,
      // og.png va h.k.) — har doim ochiq
      if (/\.[a-z0-9]+$/i.test(path)) return true;

      const isPublic =
        path === "/" ||
        path.startsWith("/login") ||
        path.startsWith("/register") ||
        path === "/terms" ||
        path.startsWith("/xizmatlar") ||
        path.startsWith("/r/");

      if (isPublic) return true;
      if (isLoggedIn) return true;

      // Admin (tyr_admin cookie) — user sahifalarini admin ko'rinishiga yo'naltiramiz.
      // Imzo bu yerda (edge) tekshirilmaydi — admin sahifalarining o'zi tekshiradi.
      if (request.cookies.get("tyr_admin")?.value) {
        const rules: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
          [/^\/orders\/([^/]+)\/?$/, (m) => `/sardorxon/admin/orders/${m[1]}`],
          [/^\/orders\/?$/, () => `/sardorxon/admin/orders`],
          [/^\/u\/([^/]+)\/?$/, (m) => `/sardorxon/admin/users/${m[1]}`],
          [/^\/messages\/([^/]+)\/?$/, (m) => `/sardorxon/admin/chats/${m[1]}`],
          [/^\/messages\/?$/, () => `/sardorxon/admin/chats`],
        ];
        for (const [re, to] of rules) {
          const mm = path.match(re);
          if (mm) return NextResponse.redirect(new URL(to(mm), nextUrl));
        }
      }

      return false;
    },
  },
} satisfies NextAuthConfig;
