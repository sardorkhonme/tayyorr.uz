import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { buyStars, STAR_PRICE } from "@/lib/stars";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ stars: z.number().int().positive().max(10_000) });

/** Hamyondagi so'mdan star sotib olish — faqat tayyorlovchilar uchun. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
  if (!me) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (me.role !== "PREPARER") {
    return mobileJson({ error: "Star faqat tayyorlovçilarga kerak" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Star sonini töğri kiriting" }, { status: 400 });
  }

  const result = await buyStars({ userId: auth.userId, stars: parsed.data.stars });
  if (!result.ok) {
    return mobileJson({ error: result.error }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "stars",
    "⭐ Star sotib olindi (mobil)",
    [
      `Foydalanuvçi: ${userLabel(user)}`,
      `Sotib olindi: ${parsed.data.stars} ⭐ (${(parsed.data.stars * STAR_PRICE).toLocaleString("ru-RU")} söm)`,
      `Yangi star balansi: ${result.newStars} ⭐`,
    ],
    siteUrl(`/sardorxon/admin/users/${auth.userId}`),
  );

  return mobileJson({ ok: true, newSom: result.newSom, newStars: result.newStars });
}
