import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { dispatchDueFamily, familyAuthors, familyRole } from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bosh sahifadagi «Tayyorr's Family» kartasi uchun: o'qilmaganlar va belgilashlar soni. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  await dispatchDueFamily();
  const [member, authors] = await Promise.all([
    db.familyMember.findUnique({ where: { userId: me }, select: { lastReadAt: true } }),
    familyAuthors(),
  ]);
  // «Xabarlar» bo'limidagi Support qatori uchun — admin paneldagi profil (nomi, rasmi)
  const support = { name: authors.support.name, image: authors.support.image };
  if (!member) return mobileJson({ joined: false, unread: 0, mentions: 0, support });
  const { isAdmin } = await familyRole(me);
  const base = { deletedAt: null, sendAt: { gt: member.lastReadAt, lte: new Date() }, NOT: { senderId: me } };
  const [unread, mentions] = await Promise.all([
    db.familyMessage.count({ where: base }),
    db.familyMessage.count({ where: { ...base, mentions: isAdmin ? { hasSome: [me, "brand", "support"] } : { has: me } } }),
  ]);
  return mobileJson({ joined: true, unread: Math.min(unread, 99), mentions: Math.min(mentions, 99), support });
}
