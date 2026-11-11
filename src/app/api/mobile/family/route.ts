import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  dispatchDueFamily,
  dispatchFamily,
  displayName,
  familyAuthors,
  familyInclude,
  familyPresence,
  familyRole,
  parseMentions,
  toFamilyClients,
  visibleFamily,
} from "@/lib/family";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const PAGE = 50;

/**
 * «Tayyorr's Family» xabarlari.
 *  · ?before=<sendAt ms> — eskiroq sahifa; ?since=<updatedAt ms> — o'zgarganlar (qayta ulanishda);
 *  · parametrsiz — oxirgi 50 ta + qadalganlar + o'qilmagan belgilashlar + mening rejalashtirganlarim.
 */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;
  await dispatchDueFamily();

  const url = new URL(req.url);
  const before = Number(url.searchParams.get("before")) || null;
  const since = Number(url.searchParams.get("since")) || null;

  if (since) {
    const rows = await db.familyMessage.findMany({
      where: { ...visibleFamily(), updatedAt: { gt: new Date(since) } },
      orderBy: { sendAt: "asc" },
      take: 200,
      include: familyInclude,
    });
    return mobileJson({ messages: await toFamilyClients(rows, { meId: me }) });
  }

  const rows = await db.familyMessage.findMany({
    where: { ...visibleFamily(), ...(before ? { sendAt: { lt: new Date(before) } } : {}) },
    orderBy: { sendAt: "desc" },
    take: PAGE + 1,
    include: familyInclude,
  });
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).reverse();
  if (before) return mobileJson({ messages: await toFamilyClients(page, { meId: me }), hasMore });

  const { user, isAdmin } = await familyRole(me);
  const member = await db.familyMember.upsert({ where: { userId: me }, update: {}, create: { userId: me } });
  const mentionWhere = isAdmin ? { hasSome: [me, "brand", "support"] } : { has: me };
  const now = new Date();
  const [pinned, mentionRows, mine, next] = await Promise.all([
    db.familyMessage.findMany({
      where: { ...visibleFamily(), pinnedAt: { not: null }, deletedAt: null },
      orderBy: { pinnedAt: "desc" },
      take: 5,
      include: familyInclude,
    }),
    db.familyMessage.findMany({
      where: { deletedAt: null, sendAt: { gt: member.lastReadAt, lte: now }, mentions: mentionWhere, NOT: { senderId: me } },
      orderBy: { sendAt: "asc" },
      take: 99,
      select: { id: true },
    }),
    db.familyMessage.findMany({
      where: { senderId: me, scheduled: true, deletedAt: null, sendAt: { gt: now } },
      orderBy: { sendAt: "asc" },
      take: 50,
      include: familyInclude,
    }),
    db.familyMessage.findFirst({
      where: { scheduled: true, dispatchedAt: null, deletedAt: null, sendAt: { gt: now } },
      orderBy: { sendAt: "asc" },
      select: { sendAt: true },
    }),
  ]);

  const self = user
    ? { kind: "user" as const, id: user.id, name: displayName(user), login: user.login, image: user.avatarUrl ?? user.image ?? null }
    : null;
  const [authors, presence] = await Promise.all([familyAuthors(), familyPresence()]);
  const identities = (isAdmin ? [self, authors.brand, authors.support] : [self]).filter(Boolean);
  return mobileJson({
    me: { id: me, isAdmin, identities },
    // sarlavha: «N aʼzo · M onlayn»
    members: presence.members,
    online: presence.online,
    messages: await toFamilyClients(page, { meId: me }),
    hasMore,
    pinned: await toFamilyClients(pinned, { meId: me }),
    mentionIds: mentionRows.map((r) => r.id),
    lastReadAt: member.lastReadAt.getTime(),
    scheduled: await toFamilyClients(mine, { meId: me }),
    // eng yaqin rejalashtirilgan xabar vaqti — ilova shu paytda qayta so'raydi (o'shanda yuboriladi)
    nextAt: next ? next.sendAt.getTime() : null,
  });
}

const sendSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  replyToId: z.string().optional(),
  as: z.enum(["self", "brand", "support"]).optional(),
  notifyAll: z.boolean().optional(),
  /** rejalashtirish (ms) — kelajakda bo'lsa */
  sendAt: z.number().int().optional(),
  file: z
    .object({
      key: z.string().min(1).startsWith("family/"),
      name: z.string().min(1).max(300),
      type: z.string().min(1).max(200),
      size: z.number().int().nonnegative(),
    })
    .optional(),
});

export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.body && !parsed.data.file)) {
    return mobileJson({ error: "Xabar yoki fayl bölişi kerak" }, { status: 400 });
  }
  const d = parsed.data;
  // fayl — faqat o'zi yuklagan (family/<userId>/...)
  if (d.file && !d.file.key.startsWith(`family/${me}/`)) {
    return mobileJson({ error: "Notöğri fayl" }, { status: 400 });
  }

  const restriction = await getRestriction(me);
  if (restriction) return mobileJson({ error: restrictionText(restriction) }, { status: 403 });

  const { isAdmin } = await familyRole(me);
  const as = isAdmin ? (d.as ?? "self") : "self";
  // spamga qarshi: daqiqasiga 20 tadan ko'p emas
  if (!isAdmin) {
    const recent = await db.familyMessage.count({ where: { senderId: me, createdAt: { gt: new Date(Date.now() - 60_000) } } });
    if (recent >= 20) return mobileJson({ error: "Juda tez yozyapsiz — biroz kuting" }, { status: 429 });
  }

  const now = Date.now();
  const scheduled = !!d.sendAt && d.sendAt > now + 30_000;
  if (scheduled && d.sendAt! > now + 365 * 24 * 3600 * 1000) {
    return mobileJson({ error: "Bir yildan uzoq muddatga rejalaştirib bölmaydi" }, { status: 400 });
  }

  let replyToId: string | null = null;
  if (d.replyToId) {
    const r = await db.familyMessage.findUnique({ where: { id: d.replyToId }, select: { id: true } });
    replyToId = r?.id ?? null;
  }

  const row = await db.familyMessage.create({
    data: {
      senderId: me,
      as,
      body: d.body ?? "",
      fileKey: d.file?.key ?? null,
      fileName: d.file?.name ?? null,
      fileType: d.file?.type ?? null,
      fileSize: d.file?.size ?? null,
      replyToId,
      mentions: await parseMentions(d.body ?? ""),
      notifyAll: isAdmin && !!d.notifyAll,
      sendAt: scheduled ? new Date(d.sendAt!) : new Date(),
      scheduled,
      dispatchedAt: scheduled ? null : new Date(),
    },
    include: familyInclude,
  });
  if (!scheduled) await dispatchFamily(row);

  const [m] = await toFamilyClients([row], { meId: me });
  return mobileJson({ message: m }, { status: 201 });
}
