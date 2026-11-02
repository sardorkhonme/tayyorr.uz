import { NextResponse, type NextRequest } from "next/server";

/**
 * admin.tayyorr.uz — umumiy komponentlar (chat, shartnoma) foydalanuvchi sahifalariga
 * havola beradi; adminda ularning o'z sahifalariga yo'naltiramiz. Eski /sardorxon/admin/...
 * havolalari ham ishlaydi.
 */
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/^\/sardorxon\/admin(\/.*)?$/, (m) => m[1] || "/"],
  [/^\/u\/([^/]+)\/?$/, (m) => `/users/${m[1]}`],
  [/^\/dashboard\/?$/, () => "/"],
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  for (const [re, to] of RULES) {
    const m = path.match(re);
    if (m) return NextResponse.redirect(new URL(to(m) + req.nextUrl.search, req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/sardorxon/:path*", "/u/:path*", "/dashboard"],
};
