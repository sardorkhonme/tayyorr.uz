import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { userSearchWhere } from "@/lib/admin-search";
import { DEFAULT_MESSAGE, getMaintenance, MAINT_USER_SELECT, saveMaintenance } from "@/lib/maintenance";

/** GET ?q= — ruxsat ro'yxatiga qo'shish uchun foydalanuvchi qidirish. */
export async function GET(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ users: [] });
  const users = await db.user.findMany({
    where: { ...userSearchWhere(q), isSupport: false, isPlatform: false },
    select: MAINT_USER_SELECT,
    take: 8,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ users });
}

const schema = z.object({
  on: z.boolean(),
  message: z.string().max(300).optional(),
  allow: z.array(z.string().min(1).max(64)).max(200),
});

/** Rejimni yoqish/o'chirish, xabar va ruxsat ro'yxati. Saytlarga ~10 soniyada yetib boradi. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Maʼlumot notöğri" }, { status: 400 });
  const prev = await getMaintenance();
  const { on, message, allow } = parsed.data;
  await saveMaintenance({
    on,
    message: message?.trim() || DEFAULT_MESSAGE,
    allow: [...new Set(allow)],
    since: on ? (prev.on ? prev.since : new Date().toISOString()) : null,
  });
  return NextResponse.json({ ok: true });
}
