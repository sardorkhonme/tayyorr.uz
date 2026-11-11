import NextAuth from "next-auth";
import { getToken } from "next-auth/jwt";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import { ADMIN_URL, LANDING_URL, PLUS_URL } from "@/lib/site";
import { audit } from "@/lib/audit";
import { getMaintenance, maintenanceGate } from "@/lib/maintenance";
import { corsHeaders } from "@/lib/mobile-cors";
import { getMobileUpdate, requestBuild, UPDATE_REQUIRED_TEXT, versionCode } from "@/lib/mobile-update";
import { SSO_COOKIE, safeNext, ssoEnabled, verifySso } from "@/lib/sso";

const { auth } = NextAuth(authConfig);
const authMiddleware = auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response | undefined>;

/** Mobil ilova Bearer JWT (HS256, MOBILE_JWT_SECRET) — imzosi to'g'ri bo'lsa userId (lib/mobile-auth.ts bilan bir xil). */
async function mobileUid(req: NextRequest): Promise<string | null> {
  const h = req.headers.get("authorization") ?? "";
  const secret = process.env.MOBILE_JWT_SECRET;
  if (!h.startsWith("Bearer ") || !secret) return null;
  const [head, body, sig] = h.slice(7).split(".");
  if (!head || !body || !sig) return null;
  try {
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const raw = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));
    if (!(await crypto.subtle.verify("HMAC", key, raw, new TextEncoder().encode(`${head}.${body}`)))) return null;
    const p = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))) as { sub?: unknown; exp?: number };
    if (typeof p.exp === "number" && p.exp * 1000 < Date.now()) return null;
    return typeof p.sub === "string" ? p.sub : null;
  } catch {
    return null;
  }
}

/**
 * app.tayyorr.uz — kabinet (ilmiy ishlar). Landing endi alohida loyiha (landing/),
 * admin panel — admin/ (admin.tayyorr.uz), kirish — faqat plus.tayyorr.uz orqali (SSO).
 */
export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const { pathname, search, origin } = req.nextUrl;

  // ---- API: yengil yo'l. Tez-tez keladigan o'qish so'rovlari (polling, mobil ilova) uchun imzo
  // tekshiruvi, audit va NextAuth sessiyasini ochish kerak emas — route'lar o'zi tekshiradi.
  // serverlararo (tayyorr+ / SMM → mobil push) — o'zi imzo tekshiradi
  if (pathname.startsWith("/api/internal/")) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    const method = req.method.toUpperCase();
    // eski mobil ilova — admin belgilagan majburiy versiyadan past bo'lsa, bazaga tegmay qaytadi
    if (pathname.startsWith("/api/mobile/") && method !== "OPTIONS" && pathname !== "/api/mobile/config") {
      const min = versionCode((await getMobileUpdate()).min);
      if (min && requestBuild(req) < min) {
        return NextResponse.json(
          { error: UPDATE_REQUIRED_TEXT, updateRequired: true },
          { status: 426, headers: corsHeaders() },
        );
      }
    }
    const write = method !== "GET" && method !== "HEAD" && method !== "OPTIONS";
    // foydalanuvchini faqat kerak bo'lganda aniqlaymiz: amal (audit) yoki texnik ishlar rejimi
    const needUid = write || (await getMaintenance()).on;
    const apiSso = needUid ? await verifySso(req.cookies.get(SSO_COOKIE)?.value) : null;
    if (write) {
      const who = apiSso ?? (await mobileUid(req));
      audit(req, (p) => ev.waitUntil(p), "app", who ? "USER" : "GUEST", who);
    }
    const apiGate = await maintenanceGate(req, apiSso, "app");
    if (apiGate) return apiGate;
    return NextResponse.next();
  }

  const ssoUid = await verifySso(req.cookies.get(SSO_COOKIE)?.value);
  // doimiy iz (admin "Loglar"): sayt — SSO, mobil ilova — imzolangan Bearer token
  const who = ssoUid ?? (await mobileUid(req));
  audit(req, (p) => ev.waitUntil(p), "app", who ? "USER" : "GUEST", who);

  // texnik ishlar rejimi — ruxsat ro'yxatidagilardan boshqasiga sayt yopiq
  const gate = await maintenanceGate(req, ssoUid, "app");
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
