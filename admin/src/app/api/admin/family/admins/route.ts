import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({ login: z.string().trim().min(1).max(60).optional(), userId: z.string().optional(), on: z.boolean() });

/** «Tayyorr's Family» admini: login (yoki id) bo'yicha qo'shish / olib tashlash. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.login && !parsed.data.userId)) {
    return NextResponse.json({ error: "Login kiriting" }, { status: 400 });
  }
  const { login, userId, on } = parsed.data;
  const user = await db.user.findFirst({
    where: userId ? { id: userId } : { login: { equals: login!.replace(/^@/, ""), mode: "insensitive" } },
    select: { id: true, isSupport: true, isPlatform: true },
  });
  if (!user || user.isPlatform) return NextResponse.json({ error: "Bunday foydalanuvçi topilmadi" }, { status: 404 });
  if (user.isSupport) return NextResponse.json({ error: "Support akkaunti doim admin" }, { status: 400 });
  await db.user.update({ where: { id: user.id }, data: { familyAdmin: on } });
  return NextResponse.json({ ok: true });
}
