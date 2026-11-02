import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";
import { shortDateTime } from "@/lib/date";
import { deliverMessage } from "@/lib/chat-notify";
import { withSource } from "@/lib/message-source";

const schema = z.object({
  // aniq sana+soat (datetime-local'dan); bo'lmasa/indefinite=true -> muddatsiz
  until: z.string().optional(),
  indefinite: z.boolean().optional().default(false),
  reason: z.string().trim().max(1000).optional(),
  notify: z.boolean().optional().default(true),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const { until: untilRaw, indefinite, reason, notify } = parsed.data;

  const user = await db.user.findUnique({ where: { id }, select: { isSupport: true } });
  if (!user) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (user.isSupport) {
    return NextResponse.json({ error: "Support hisobini cheklab bo'lmaydi" }, { status: 400 });
  }

  let until: Date;
  if (indefinite || !untilRaw) {
    until = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000); // ~muddatsiz
  } else {
    until = new Date(untilRaw);
    if (Number.isNaN(until.getTime()) || until.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Sana va soat kelajakda bo'lishi kerak" },
        { status: 400 },
      );
    }
  }

  await db.user.update({
    where: { id },
    data: { bannedUntil: until, banReason: reason || null },
  });

  if (notify) {
    const supportId = await getSupportUserId();
    const conv = await getOrCreateConversation(supportId, id);
    const when =
      indefinite || !untilRaw ? "muddatsiz" : `${shortDateTime(until)}gacha`;
    const body = `Siz ${when} cheklov oldingiz.${
      reason ? ` Sabab: ${reason}.` : ""
    } Bu davrda siz faqat «tayyorr.uz support» bilan yozisha olasiz. Savollaringiz bo'lsa shu yerga yozing.`;
    const m = await createMessage({
      conversationId: conv.id,
      senderId: supportId,
      body: withSource(body, "ikkalasi"), // hisob cheklovi — ikkala platformada
      system: false, // support xabari — oddiy bubble
    });
    await deliverMessage(m);
  }

  return NextResponse.json({ ok: true, until });
}
