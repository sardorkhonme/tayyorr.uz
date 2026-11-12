import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { FAMILY_EMOJIS, familyEmoji, familyInclude, familySignal, toFamilyClients } from "@/lib/family";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({ emoji: z.string().max(16).nullable() });

/** Admin (Support nomidan) reaksiyasi: bitta xabarga bitta; o'sha emojini qayta bossa — olib tashlanadi. */
export async function POST(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { msgId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (parsed.success && parsed.data.emoji) parsed.data.emoji = familyEmoji(parsed.data.emoji);
  if (!parsed.success || (parsed.data.emoji && !FAMILY_EMOJIS.includes(parsed.data.emoji))) {
    return NextResponse.json({ error: "Notöğri reaksiya" }, { status: 400 });
  }
  const msg = await db.familyMessage.findUnique({ where: { id: msgId }, select: { deletedAt: true, sendAt: true } });
  if (!msg || msg.deletedAt || msg.sendAt.getTime() > Date.now()) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  const me = await getSupportUserId();
  const key = { messageId_userId: { messageId: msgId, userId: me } };
  const cur = await db.familyReaction.findUnique({ where: key, select: { emoji: true } });
  const emoji = parsed.data.emoji;
  if (!emoji || (cur && familyEmoji(cur.emoji) === emoji)) {
    await db.familyReaction.deleteMany({ where: { messageId: msgId, userId: me } });
  } else {
    await db.familyReaction.upsert({ where: key, update: { emoji, createdAt: new Date() }, create: { messageId: msgId, userId: me, emoji } });
  }
  const row = await db.familyMessage.update({ where: { id: msgId }, data: { updatedAt: new Date() }, include: familyInclude });
  const [pub] = await toFamilyClients([row]);
  familySignal("upd", { id: row.id, m: pub });
  const [out] = await toFamilyClients([row], { forAdmin: true });
  return NextResponse.json({ message: out });
}
