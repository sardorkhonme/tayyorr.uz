import { NextResponse } from "next/server";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { signSso, ssoEnabled } from "@/lib/sso";

export { OPTIONS } from "@/lib/mobile-cors";

/**
 * Mobil ilova Tayyorr SMM (smm.tayyorr.uz) API'larini saytdagi kabi SSO belgisi bilan chaqiradi —
 * shu yerda mobil token evaziga o'sha foydalanuvchining belgisi beriladi (30 kun).
 */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  if (!ssoEnabled()) return mobileJson({ error: "Xizmat vaqtinça işlamayapti" }, { status: 503 });
  return mobileJson({ sso: await signSso(auth.userId) });
}
