import { NextResponse } from "next/server";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";
import { VISIBLE_ON_UZ } from "@/lib/message-source";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const me = actor.id;

  const conv = await conversationForActor(id, actor);
  if (!conv) {
    return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
  }

  const res = await db.message.updateMany({
    // foydalanuvchi tayyorr.uz da o'qiganda tayyorr+ ga xos xabarlar o'qilmagan bo'lib qoladi
    where: { conversationId: id, senderId: { not: me }, readAt: null, ...(actor.support ? {} : VISIBLE_ON_UZ) },
    data: { readAt: new Date() },
  });

  if (res.count > 0) {
    publishToConversation(id, {
      type: "read",
      by: me,
      at: new Date().toISOString(),
    });
  }

  return NextResponse.json({ ok: true, marked: res.count });
}
