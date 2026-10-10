import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { z } from "zod";

import { db } from "@/lib/db";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { logActivity } from "@/lib/activity";
import { saveGoogleBirthday } from "@/lib/birthday";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  idToken: z.string().min(1),
  // tug'ilgan kun ruxsati berilgan bo'lsa — People API uchun (ixtiyoriy)
  accessToken: z.string().min(1).optional(),
});

const client = new OAuth2Client(process.env.AUTH_GOOGLE_ID);

/**
 * Mobil ilovadan "Google bilan kirish". Google ID token'ini tekshiramiz,
 * email bo'yicha mavjud foydalanuvchini topamiz yoki yangisini yaratamiz
 * (web'dagi NextAuth + PrismaAdapter xatti-harakatini takrorlaydi —
 * shuning uchun bir xil email ikkala platformada ham bitta hisobga tushadi).
 * Rol/login hali tanlanmagan bo'lsa, javobdagi needsOnboarding=true bo'ladi
 * va ilova /api/mobile/onboarding'ga yo'naltiradi.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "idToken kerak" }, { status: 400 });
  }

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: process.env.AUTH_GOOGLE_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return mobileJson({ error: "Google token yaroqsiz" }, { status: 401 });
  }

  const email = payload?.email;
  if (!email) {
    return mobileJson({ error: "Google hisobda email topilmadi" }, { status: 400 });
  }

  let user = await db.user.findUnique({ where: { email }, select: ME_SELECT });
  if (!user) {
    user = await db.user.create({
      data: {
        email,
        name: payload?.name ?? null,
        image: payload?.picture ?? null,
        emailVerified: payload?.email_verified ? new Date() : null,
      },
      select: ME_SELECT,
    });
    await logActivity(user.id, "AUTH_LOGIN", "Google bilan ro'yxatdan o'tdi (mobil ilova)");
  } else {
    await logActivity(user.id, "AUTH_LOGIN", "Google bilan kirdi (mobil ilova)");
  }

  await saveGoogleBirthday(user.id, parsed.data.accessToken);

  const token = signMobileToken(user.id);
  return mobileJson({ token, user: serializeMe(user) });
}
