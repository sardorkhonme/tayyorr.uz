import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ at: z.number().int() });

/** Shu vaqtgacha o'qildi (faqat oldinga suriladi). */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const at = new Date(Math.min(parsed.data.at, Date.now()));
  await db.familyMember.upsert({ where: { userId: auth.userId }, update: {}, create: { userId: auth.userId, lastReadAt: at } });
  await db.familyMember.updateMany({ where: { userId: auth.userId, lastReadAt: { lt: at } }, data: { lastReadAt: at } });
  return mobileJson({ ok: true });
}
