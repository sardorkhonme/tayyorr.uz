import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

import { maintenanceGate } from "@/lib/maintenance";
import { SSO_COOKIE, safeNext, signSso, ssoClearOptions, ssoCookieOptions, ssoEnabled, verifySso } from "@/lib/sso";

/** Kirgach qaytiladigan manzil (masalan app.tayyorr.uz) — 10 daqiqa saqlanadi. */
const NEXT_COOKIE = "tyr_next";

/**
 * tayyorr+ — yagona kirish nuqtasi. Bu yerda kirgan foydalanuvchiga `.tayyorr.uz`
 * domeniga SSO belgisi qo'yiladi (boshqa subdomenlar shu orqali avtomatik kiradi),
 * chiqqanda esa olib tashlanadi.
 */
export async function middleware(req: NextRequest) {
  const { pathname, searchParams, protocol } = req.nextUrl;
  const secure = protocol === "https:";
  const host = req.headers.get("host");

  const token = await getToken({ req, secret: process.env.AUTH_SECRET, secureCookie: secure });
  const uid = typeof token?.sub === "string" ? token.sub : null;

  // texnik ishlar rejimi — kirish sahifasi ochiq (ruxsat ro'yxatidagi odam kira olsin), qolgani yopiq
  const gate = await maintenanceGate(req, uid, "plus", [/^\/(login|logout|app-login)(\/|$)/]);
  if (gate) return gate;
  // API — faqat rejim tekshiruvi uchun; SSO/qaytish mantiqi avvalgidek faqat sahifalarda
  if (pathname.startsWith("/api/")) return NextResponse.next();

  let res = NextResponse.next();

  // boshqa subdomendan "kirish" uchun kelgan — qaytish manzilini eslab qolamiz
  if (pathname === "/login" || pathname === "/register") {
    const next = safeNext(searchParams.get("next"));
    if (next) {
      if (uid && ssoEnabled()) {
        res = NextResponse.redirect(next);
      } else {
        res.cookies.set(NEXT_COOKIE, next, { path: "/", maxAge: 600, sameSite: "lax", secure, httpOnly: true });
      }
    }
  } else if (uid && pathname !== "/onboarding") {
    // kirdi (profil ham to'liq) — kutilgan joyga qaytaramiz
    const next = safeNext(req.cookies.get(NEXT_COOKIE)?.value);
    if (next) {
      res = NextResponse.redirect(next);
      res.cookies.delete(NEXT_COOKIE);
    }
  }

  if (ssoEnabled()) {
    const current = await verifySso(req.cookies.get(SSO_COOKIE)?.value);
    if (uid && current !== uid) {
      res.cookies.set(SSO_COOKIE, await signSso(uid), ssoCookieOptions(host, secure));
    } else if (!uid && req.cookies.get(SSO_COOKIE)) {
      // tayyorr+ dan chiqilgan — hamma platformadan chiqiladi
      res.cookies.set(SSO_COOKIE, "", ssoClearOptions(host, secure));
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|json|js|wav)$).*)"],
};
