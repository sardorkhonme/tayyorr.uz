import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { SSO_COOKIE, ssoClearOptions } from "@/lib/sso";

const LANDING_URL = process.env.NEXT_PUBLIC_MAIN_URL || "https://tayyorr.uz";

/**
 * Umumiy chiqish: boshqa platformalar (app.tayyorr.uz) "chiqish"da shu yerga yuboradi —
 * tayyorr+ sessiyasi va `.tayyorr.uz` SSO belgisi o'chiriladi, so'ng landingga.
 */
export async function GET(req: Request) {
  await signOut({ redirect: false });
  const res = NextResponse.redirect(LANDING_URL);
  const host = req.headers.get("host");
  const secure = new URL(req.url).protocol === "https:";
  res.cookies.set(SSO_COOKIE, "", ssoClearOptions(host, secure));
  return res;
}
