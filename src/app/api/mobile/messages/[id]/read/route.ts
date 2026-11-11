import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { publishToConversation } from "@/lib/chat-bus";
import { scopeOf, visibleOn } from "@/lib/message-source";

export { OPTIONS } from "@/lib/mobile-cors";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const res = await db.message.updateMany({
    where: { conversationId: id, senderId: { not: me }, readAt: null, ...visibleOn(scopeOf(req.url)) },
    data: { readAt: new Date() },
  });

  if (res.count > 0) {
    publishToConversation(id, { type: "read", by: me, at: new Date().toISOString() });
  }

  return mobileJson({ ok: true, marked: res.count });
}
