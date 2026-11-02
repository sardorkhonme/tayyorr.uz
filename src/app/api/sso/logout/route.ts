import { NextResponse } from "next/server";

import { signOut } from "@/auth";
import { PLUS_URL } from "@/lib/site";
import { ssoEnabled } from "@/lib/sso";

/**
 * Umumiy chiqish: shu yerdagi sessiya yopiladi, so'ng tayyorr+ ning /logout iga —
 * u yerda tayyorr+ sessiyasi va `.tayyorr.uz` SSO belgisi o'chadi (hamma platformadan chiqiladi).
 */
export async function GET(req: Request) {
  await signOut({ redirect: false });
  return NextResponse.redirect(ssoEnabled() ? new URL("/logout", PLUS_URL) : new URL("/login", req.url));
}
