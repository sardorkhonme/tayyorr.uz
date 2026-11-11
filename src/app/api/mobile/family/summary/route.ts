import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { dispatchDueFamily, familyRole } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bosh sahifadagi «Tayyorr's Family» kartasi uchun: o'qilmaganlar va belgilashlar soni. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  await dispatchDueFamily();
  const member = await db.familyMember.findUnique({ where: { userId: me }, select: { lastReadAt: true } });
  if (!member) return mobileJson({ joined: false, unread: 0, mentions: 0 });
  const { isAdmin } = await familyRole(me);
  const base = { deletedAt: null, sendAt: { gt: member.lastReadAt, lte: new Date() }, NOT: { senderId: me } };
  const [unread, mentions] = await Promise.all([
    db.familyMessage.count({ where: base }),
    db.familyMessage.count({ where: { ...base, mentions: isAdmin ? { hasSome: [me, "brand", "support"] } : { has: me } } }),
  ]);
  return mobileJson({ joined: true, unread: Math.min(unread, 99), mentions: Math.min(mentions, 99) });
}
