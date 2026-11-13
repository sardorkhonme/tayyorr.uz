import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { publishToConversation } from "@/lib/chat-bus";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(200) });

/** Bir nechta xabarni bittada öçiriş — har biri yakka DELETE dagi qoida bilan: faqat öz xabari. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const ids = [...new Set(parsed.data.ids)];

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const rows = await db.message.findMany({
    where: { id: { in: ids }, conversationId: id },
    select: { id: true, senderId: true, deletedAt: true },
  });
  if (rows.length !== ids.length) return mobileJson({ error: "Xabar topilmadi" }, { status: 404 });
  if (rows.some((m) => m.senderId !== me)) {
    return mobileJson({ error: "Faqat öz xabaringizni öçira olasiz" }, { status: 403 });
  }
  const todo = rows.filter((m) => !m.deletedAt).map((m) => m.id);

  const now = new Date();
  const updated = await db.$transaction(
    todo.map((msgId) => db.message.update({ where: { id: msgId }, data: { deletedAt: now }, select: { id: true, updatedAt: true } })),
  );
  for (const u of updated) {
    publishToConversation(id, { type: "delete", messageId: u.id, updatedAt: u.updatedAt.toISOString() });
  }

  return mobileJson({ ok: true, ids: updated.map((u) => u.id) });
}
