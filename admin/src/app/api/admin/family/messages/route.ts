import { NextResponse, after } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import {
  dispatchDueFamily,
  dispatchFamily,
  familyAuthors,
  familyInclude,
  familyPresence,
  parseMentions,
  toFamilyClients,
  replyMentionId,
  withReplyMention,
} from "@/lib/family";
import { getSupportUserId } from "@/lib/support";

export const dynamic = "force-dynamic";

const PAGE = 60;

/**
 * Admin: «Tayyorr's Family» xabarlari (o'chirilganlari ham, rejalashtirilganlari ham).
 *  · ?before=<sendAt ms> — eskiroq sahifa; ?since=<updatedAt ms> — o'zgarganlar (so'rab turish).
 */
export async function GET(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  await dispatchDueFamily();

  const url = new URL(req.url);
  const before = Number(url.searchParams.get("before")) || null;
  const since = Number(url.searchParams.get("since")) || null;
  const me = await getSupportUserId();

  if (since) {
    const rows = await db.familyMessage.findMany({
      where: { updatedAt: { gt: new Date(since) } },
      orderBy: { sendAt: "asc" },
      take: 200,
      include: familyInclude,
    });
    const presence = await familyPresence();
    return NextResponse.json({ messages: await toFamilyClients(rows, { forAdmin: true }), ...presence });
  }

  const rows = await db.familyMessage.findMany({
    where: before ? { sendAt: { lt: new Date(before) } } : {},
    orderBy: { sendAt: "desc" },
    take: PAGE + 1,
    include: familyInclude,
  });
  const hasMore = rows.length > PAGE;
  const page = rows.slice(0, PAGE).reverse();
  const messages = await toFamilyClients(page, { forAdmin: true });
  if (before) return NextResponse.json({ messages, hasMore });

  const [authors, presence, total] = await Promise.all([familyAuthors(), familyPresence(), db.familyMessage.count()]);
  return NextResponse.json({ me, support: authors.support, messages, hasMore, total, ...presence });
}

const sendSchema = z.object({
  body: z.string().trim().max(4000).optional(),
  replyToId: z.string().optional(),
  notifyAll: z.boolean().optional(),
  file: z
    .object({
      key: z.string().min(1).startsWith("family/"),
      name: z.string().min(1).max(300),
      type: z.string().min(1).max(200),
      size: z.number().int().nonnegative(),
    })
    .optional(),
});

/** Admin guruhga faqat «Tayyorr Support» nomidan yozadi (senderId — support akkaunti). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.body && !parsed.data.file)) {
    return NextResponse.json({ error: "Xabar yoki fayl bölişi kerak" }, { status: 400 });
  }
  const d = parsed.data;
  const me = await getSupportUserId();
  if (d.file && !d.file.key.startsWith(`family/${me}/`)) {
    return NextResponse.json({ error: "Notöğri fayl" }, { status: 400 });
  }

  let replyToId: string | null = null;
  // javob — asl xabar egasini belgilash hisoblanadi (mentions'ga qo'shiladi)
  let replyMention: string | null = null;
  if (d.replyToId) {
    const r = await db.familyMessage.findUnique({
      where: { id: d.replyToId },
      select: { id: true, senderId: true, as: true, deletedAt: true },
    });
    replyToId = r?.id ?? null;
    replyMention = replyMentionId(r, me);
  }

  const row = await db.familyMessage.create({
    data: {
      senderId: me,
      as: "support",
      body: d.body ?? "",
      fileKey: d.file?.key ?? null,
      fileName: d.file?.name ?? null,
      fileType: d.file?.type ?? null,
      fileSize: d.file?.size ?? null,
      replyToId,
      mentions: withReplyMention(await parseMentions(d.body ?? ""), replyMention),
      notifyAll: !!d.notifyAll,
      sendAt: new Date(),
      scheduled: false,
      dispatchedAt: new Date(),
    },
    include: familyInclude,
  });
  after(() => dispatchFamily(row).catch(() => {}));

  const [m] = await toFamilyClients([row], { forAdmin: true, noSeen: true });
  return NextResponse.json({ message: m }, { status: 201 });
}
