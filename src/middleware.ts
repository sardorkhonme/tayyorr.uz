import NextAuth from "next-auth";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";

import { authConfig } from "@/auth.config";
import { APP_URL, LANDING_URL, isLandingPath, isSharedPath, siteRole } from "@/lib/site";

const { auth } = NextAuth(authConfig);
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const authMiddleware = auth as unknown as (req: NextRequest, ev: NextFetchEvent) => Promise<Response | undefined>;

function moveTo(base: string, req: NextRequest, path = req.nextUrl.pathname) {
  const url = new URL(path + req.nextUrl.search, base);
  return NextResponse.redirect(url, 308);
}

export default async function middleware(req: NextRequest, ev: NextFetchEvent) {
  const role = siteRole(req.headers.get("host"));
  const path = req.nextUrl.pathname;

  if (role !== "all" && !isSharedPath(path)) {
    // tayyorr.uz — faqat landing; kabinet sahifalari (eski havolalar ham) app.tayyorr.uz ga
    if (role === "landing" && !isLandingPath(path)) return moveTo(APP_URL, req);
    if (role === "app" && isLandingPath(path)) {
      // app.tayyorr.uz/ — darhol kabinet; marketing sahifalari esa landingda
      if (path === "/") return NextResponse.redirect(new URL("/dashboard", req.url));
      return moveTo(LANDING_URL, req);
    }
  }

  return authMiddleware(req, ev);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml|webmanifest|json)$).*)",
  ],
};
