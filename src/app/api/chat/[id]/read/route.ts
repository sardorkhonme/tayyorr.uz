import { NextResponse } from "next/server";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";

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
    where: { conversationId: id, senderId: { not: me }, readAt: null },
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
