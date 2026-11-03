import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { publishToConversation } from "@/lib/chat-bus";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ value: z.enum(["LIKE", "DISLIKE"]).nullable() });

/** Xabarga like/dislike qo'yish yoki olib tashlash — web bilan bir xil mantiq. */
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

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri" }, { status: 400 });

  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id) {
    return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
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

  await db.message.update({ where: { id: msgId }, data: { body: msg.body } });

  const reactions = await db.messageReaction.findMany({ where: { messageId: msgId } });
  const like = reactions.filter((r) => r.value === "LIKE").length;
  const dislike = reactions.filter((r) => r.value === "DISLIKE").length;

  publishToConversation(id, { type: "reaction", messageId: msgId, like, dislike });

  return mobileJson({ like, dislike, mine: parsed.data.value });
}
