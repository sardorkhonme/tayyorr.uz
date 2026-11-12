import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";
import { publishToConversation } from "@/lib/chat-bus";
import { applyReaction, parseReactionInput, reactionResponse } from "@/lib/reactions";

/** Admin "tayyorr.uz support" nomidan xabarga reaksiya bildiradi. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id, msgId } = await params;
  const supportId = await getSupportUserId();

  const input = parseReactionInput(await req.json().catch(() => null));
  if (!input) {
    return NextResponse.json({ error: "Notöğri" }, { status: 400 });
  }

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id || msg.deletedAt) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  const rows = await applyReaction(msgId, supportId, input);
  const res = reactionResponse(rows, supportId);
  publishToConversation(id, {
    type: "reaction",
    messageId: msgId,
    like: res.like,
    dislike: res.dislike,
    reactions: res.reactions.map(({ emoji, count, users }) => ({ emoji, count, users })),
  });

  return NextResponse.json(res);
}
