import { NextResponse } from "next/server";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";
import { applyReaction, parseReactionInput, reactionResponse } from "@/lib/reactions";

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

  const input = parseReactionInput(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Notöğri" }, { status: 400 });
  }

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id || msg.deletedAt) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  const rows = await applyReaction(msgId, me, input);
  const res = reactionResponse(rows, me);
  publishToConversation(id, {
    type: "reaction",
    messageId: msgId,
    like: res.like,
    dislike: res.dislike,
    reactions: res.reactions.map(({ emoji, count, users }) => ({ emoji, count, users })),
  });

  return NextResponse.json(res);
}
