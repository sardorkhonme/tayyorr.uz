import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import { signIn } from "@/auth";
import { PLUS_URL } from "@/lib/site";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/**
 * tayyorr+ da kirilgan foydalanuvchini shu yerda ham kiritadi (SSO belgisi orqali),
 * so'ng so'ralgan sahifaga qaytaradi. Belgi yaroqsiz bo'lsa — tayyorr+ dan ham chiqariladi
 * (aks holda ikki sayt o'rtasida aylanib qolishi mumkin).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const raw = url.searchParams.get("next") || "/dashboard";
  const next = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  const token = (await cookies()).get(SSO_COOKIE)?.value;

  if (!(await verifySso(token))) return NextResponse.redirect(new URL("/logout", PLUS_URL));
  try {
    await signIn("sso", { token, redirectTo: next });
  } catch (e) {
    // muvaffaqiyatli kirishda signIn redirect "xatosi" otadi — uni o'tkazib yuboramiz
    if (e && typeof e === "object" && "digest" in e && String((e as { digest: unknown }).digest).startsWith("NEXT_REDIRECT")) throw e;
    console.error("[sso] consume", e);
    return NextResponse.redirect(new URL("/logout", PLUS_URL));
  }
  return NextResponse.redirect(new URL(next, req.url));
}
