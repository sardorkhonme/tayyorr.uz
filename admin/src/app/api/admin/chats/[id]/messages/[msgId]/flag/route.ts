import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({ body: z.string().trim().min(1).max(3000) });

/** Admin xabarni ko'rib chiqish uchun belgilaydi (shikoyat ro'yxatiga tushadi). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id, msgId } = await params;
  const supportId = await getSupportUserId();

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Izoh kerak" }, { status: 400 });
  }

  await db.complaint.create({
    data: {
      reporterId: supportId,
      suspectId: msg.senderId === supportId ? null : msg.senderId,
      messageId: msgId,
      body: parsed.data.body,
    },
  });

  return NextResponse.json({ ok: true });
}
