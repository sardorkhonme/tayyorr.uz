import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";
import { signMobileToken } from "@/lib/mobile-auth";
import { logActivity } from "@/lib/activity";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  login: z.string().trim().min(1),
  password: z.string().min(1),
});

/** Flutter ilovasi uchun login — login (yoki email) + parol, javobida Bearer token. */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Login (yoki email) va parolni kiriting" }, { status: 400 });
  }
  const { login, password } = parsed.data;

  // login yoki email (tayyorr+ da email bilan ro'yxatdan o'tganlar uchun)
  const user = await db.user.findUnique({
    where: login.includes("@") ? { email: login.toLowerCase() } : { login },
    select: { ...ME_SELECT, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return mobileJson({ error: "Login yoki parol xato" }, { status: 401 });
  }
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return mobileJson({ error: "Login yoki parol xato" }, { status: 401 });
  }
  // profil to'liq bo'lmasa (masalan tayyorr+ da ro'yxatdan o'tgan) — ilova
  // `needsOnboarding` bo'yicha profil to'ldirish sahifasini ochadi

  const token = signMobileToken(user.id);
  await logActivity(user.id, "AUTH_LOGIN", "Mobil ilovadan kirdi");

  return mobileJson({ token, user: serializeMe(user) });
}
