import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { publishToConversation } from "@/lib/chat-bus";
import { applyReaction, parseReactionInput, reactionResponse } from "@/lib/reactions";

export { OPTIONS } from "@/lib/mobile-cors";

/** Xabarga emoji reaksiya (Family'dagidek; eski ilovaning LIKE/DISLIKE'i ham) — web bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, msgId } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const input = parseReactionInput(await req.json().catch(() => null));
  if (!input) return mobileJson({ error: "Notöğri" }, { status: 400 });

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id || msg.deletedAt) {
    return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
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

  return mobileJson(res);
}
