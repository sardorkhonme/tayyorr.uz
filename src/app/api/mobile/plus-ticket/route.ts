import { randomBytes } from "crypto";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bir martalik kalit muddati — ilova darhol tayyorr+ ni ochadi. */
const TTL_MS = 2 * 60 * 1000;

/**
 * Mobil ilova tayyorr+ ni o'z ichida (WebView) ochganda foydalanuvchini avtomatik
 * kiritish uchun bir martalik kalit. WebView'da Google bilan kirish bloklangani uchun
 * kerak. Kalit VerificationToken jadvalida (identifier: "plus-app:<userId>"),
 * tayyorr+ uni bir marta ishlatib o'chiradi (smm/src/auth.ts — "app-ticket").
 */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof Response) return auth;

  // eski ishlatilmagan kalitlarni tozalaymiz
  await db.verificationToken
    .deleteMany({ where: { identifier: `plus-app:${auth.userId}` } })
    .catch(() => {});

  const token = randomBytes(32).toString("base64url");
  await db.verificationToken.create({
    data: { identifier: `plus-app:${auth.userId}`, token, expires: new Date(Date.now() + TTL_MS) },
  });
  return mobileJson({ ticket: token });
}
