import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { FAMILY_EMOJIS, familyInclude, familySignal, toFamilyClients } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { scopedApiError } from "@/lib/restriction-scope";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ emoji: z.string().max(16).nullable() });

/** Reaksiya: bir xabarga bitta; o'sha emojini qayta bossa — olib tashlanadi; `null` — olib tashlash. */
export async function POST(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  const { msgId } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (parsed.data.emoji && !FAMILY_EMOJIS.includes(parsed.data.emoji))) {
    return mobileJson({ error: "Notöğri reaksiya" }, { status: 400 });
  }
  const restriction = await getRestriction(me);
  if (restriction) return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  const scoped = await scopedApiError(me, "family", null, true);
  if (scoped) return scoped;

  const msg = await db.familyMessage.findUnique({ where: { id: msgId }, select: { deletedAt: true, sendAt: true } });
  if (!msg || msg.deletedAt || msg.sendAt.getTime() > Date.now()) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });

  const key = { messageId_userId: { messageId: msgId, userId: me } };
  const cur = await db.familyReaction.findUnique({ where: key, select: { emoji: true } });
  const emoji = parsed.data.emoji;
  if (!emoji || cur?.emoji === emoji) {
    await db.familyReaction.deleteMany({ where: { messageId: msgId, userId: me } });
  } else {
    await db.familyReaction.upsert({ where: key, update: { emoji, createdAt: new Date() }, create: { messageId: msgId, userId: me, emoji } });
  }
  // xabarning updatedAt — `since` bilan qayta ulanganlar ham yangi reaksiyani olsin
  const row = await db.familyMessage.update({ where: { id: msgId }, data: { updatedAt: new Date() }, include: familyInclude });
  const [m] = await toFamilyClients([row], { meId: me });
  familySignal("upd", { id: row.id, m: { ...m, mine: undefined } });
  return mobileJson({ message: m });
}
