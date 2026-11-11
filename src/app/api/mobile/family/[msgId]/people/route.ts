import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { displayName } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

const userSelect = { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } as const;

/** Xabar bo'yicha: kim qaysi reaksiyani bosgan va kim ko'rgan (hamma a'zolarga ochiq). */
export async function GET(req: Request, { params }: { params: Promise<{ msgId: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { msgId } = await params;
  const msg = await db.familyMessage.findUnique({ where: { id: msgId }, select: { senderId: true, sendAt: true, deletedAt: true } });
  if (!msg || msg.deletedAt) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });

  const seenWhere = { lastReadAt: { gte: msg.sendAt }, NOT: { userId: msg.senderId } };
  const [reactions, seen, seenCount] = await Promise.all([
    db.familyReaction.findMany({ where: { messageId: msgId }, orderBy: { createdAt: "desc" }, take: 300, include: { user: { select: userSelect } } }),
    db.familyMember.findMany({ where: seenWhere, orderBy: { lastReadAt: "desc" }, take: 200, include: { user: { select: userSelect } } }),
    db.familyMember.count({ where: seenWhere }),
  ]);
  const pub = (u: (typeof reactions)[number]["user"]) => ({ id: u.id, name: displayName(u), login: u.login, image: u.avatarUrl ?? u.image ?? null });
  return mobileJson({
    reactions: reactions.map((r) => ({ emoji: r.emoji, at: r.createdAt.getTime(), user: pub(r.user) })),
    seen: seen.map((s) => ({ at: s.lastReadAt.getTime(), user: pub(s.user) })),
    seenCount,
  });
}
