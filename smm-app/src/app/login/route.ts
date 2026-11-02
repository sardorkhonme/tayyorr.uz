import { NextResponse } from "next/server";

import { PLUS_URL } from "@/lib/session";

/** Kirish/ro'yxatdan o'tish — tayyorr+ da (umumiy hisob); so'ng shu saytga qaytadi. */
export function GET(req: Request) {
  const url = new URL(req.url);
  const back = url.searchParams.get("next") || "/";
  const to = new URL("/login", PLUS_URL);
  to.searchParams.set("next", new URL(back.startsWith("/") ? back : "/", url.origin).toString());
  return NextResponse.redirect(to);
}
