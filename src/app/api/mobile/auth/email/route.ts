import { z } from "zod";

import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { signMobileToken } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { ME_SELECT, serializeMe } from "@/lib/mobile-me";
import { verifyMobileEmailTicket } from "@/lib/mobile-ticket";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ ticket: z.string().min(10).max(300) });

/**
 * Mobil ilova: email kod bilan ro'yxatdan o'tish / kirish. Kod tayyorr+ da tekshiriladi
 * (plus/src/app/api/mobile/email/verify) va u bergan qisqa chipta shu yerda mobil tokenga almashtiriladi.
 * Profil to'ldirilmagan bo'lsa — needsOnboarding (Google bilan kirishdagidek).
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Chipta kerak" }, { status: 400 });
  const userId = await verifyMobileEmailTicket(parsed.data.ticket);
  if (!userId) return mobileJson({ error: "Tasdiqlaş muddati ötdi. Qaytadan kod sörang" }, { status: 401 });

  const user = await db.user.findUnique({ where: { id: userId }, select: ME_SELECT });
  if (!user) return mobileJson({ error: "Hisob topilmadi" }, { status: 404 });
  await logActivity(user.id, "AUTH_LOGIN", "Email kod bilan kirdi (mobil ilova)");
  return mobileJson({ token: signMobileToken(user.id), user: serializeMe(user) });
}
