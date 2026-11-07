import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import { ADMIN_URL, LANDING_URL, PLUS_URL } from "@/lib/site";
import { maintenanceGate } from "@/lib/maintenance";
import { SSO_COOKIE, safeNext, ssoEnabled, verifySso } from "@/lib/sso";

const { auth } = NextAuth(authConfig);
const authMiddleware = auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response | undefined>;

/**
 * app.tayyorr.uz — kabinet (ilmiy ishlar). Landing endi alohida loyiha (landing/),
 * admin panel — admin/ (admin.tayyorr.uz), kirish — faqat plus.tayyorr.uz orqali (SSO).
 */
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { pathname, search, origin } = req.nextUrl;

  // texnik ishlar rejimi — ruxsat ro'yxatidagilardan boshqasiga sayt yopiq
  const gate = await maintenanceGate(req, await verifySso(req.cookies.get(SSO_COOKIE)?.value), "app");
  if (gate) return gate;

  if (!pathname.startsWith("/api/")) {
    // bosh sahifa — darhol kabinet
    if (pathname === "/") return NextResponse.redirect(new URL("/dashboard", req.url));
    // marketing sahifalari landingda
    if (pathname === "/xizmatlar" || pathname.startsWith("/xizmatlar/")) {
      return NextResponse.redirect(new URL(pathname + search, LANDING_URL), 308);
    }
    // admin panel alohida domenda
    if (ADMIN_URL && (pathname === "/sardorxon/admin" || pathname.startsWith("/sardorxon/admin/"))) {
      const rest = pathname.slice("/sardorxon/admin".length) || "/";
      return NextResponse.redirect(new URL(rest + search, ADMIN_URL), 308);
    }

    if (ssoEnabled() && !pathname.startsWith("/sardorxon")) {
      const sso = await verifySso(req.cookies.get(SSO_COOKIE)?.value);
      const secure = req.nextUrl.protocol === "https:";
      const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: secure });
      const uid = typeof token?.sub === "string" ? token.sub : null;

      // kirish/ro'yxatdan o'tish — faqat tayyorr+ da
      if (pathname === "/login" || pathname === "/register") {
        if (sso) return NextResponse.redirect(new URL("/dashboard", req.url));
        const cb = req.nextUrl.searchParams.get("callbackUrl");
        const next = safeNext(cb ? new URL(cb, origin).toString() : null) ?? `${origin}/dashboard`;
        const to = new URL(pathname === "/register" ? "/register" : "/login", PLUS_URL);
        to.searchParams.set("next", next);
        return NextResponse.redirect(to);
      }

      // tayyorr+ da kirilgan, bu yerda hali emas (yoki boshqa hisob) — avtomatik kiritamiz
      if (sso && sso !== uid) {
        const to = new URL("/api/sso/consume", req.url);
        to.searchParams.set("next", pathname + search);
        return NextResponse.redirect(to);
      }
      // tayyorr+ dan chiqilgan — bu yerdan ham chiqamiz
      if (!sso && uid) {
        return NextResponse.redirect(new URL("/api/sso/logout", req.url));
      }
    }
  }

  return authMiddleware(req, ev);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest|json)$).*)",
  ],
};
