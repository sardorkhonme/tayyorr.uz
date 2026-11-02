import { NextResponse } from "next/server";
import { z } from "zod";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";

const schema = z.object({ value: z.enum(["LIKE", "DISLIKE"]).nullable() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id, msgId } = await params;
  const me = actor.id;

  const conv = await conversationForActor(id, actor);
  if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri" }, { status: 400 });
  }

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  if (parsed.data.value === null) {
    await db.messageReaction
      .delete({ where: { messageId_userId: { messageId: msgId, userId: me } } })
      .catch(() => {});
  } else {
    await db.messageReaction.upsert({
      where: { messageId_userId: { messageId: msgId, userId: me } },
      update: { value: parsed.data.value },
      create: { messageId: msgId, userId: me, value: parsed.data.value },
    });
  }

  // polling uchun updatedAt ni yangilaymiz
  await db.message.update({ where: { id: msgId }, data: { body: msg.body } });

  const reactions = await db.messageReaction.findMany({ where: { messageId: msgId } });
  const like = reactions.filter((r) => r.value === "LIKE").length;
  const dislike = reactions.filter((r) => r.value === "DISLIKE").length;

  publishToConversation(id, {
    type: "reaction",
    messageId: msgId,
    like,
    dislike,
  });

  return NextResponse.json({ like, dislike, mine: parsed.data.value });
}
