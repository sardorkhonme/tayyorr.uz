import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser } from "@/lib/chat";
import { publishToConversation } from "@/lib/chat-bus";
import { toClientMessage, toSerializedMessage } from "@/lib/chat-messages";

export { OPTIONS } from "@/lib/mobile-cors";

async function loadOwn(convId: string, msgId: string, meId: string) {
  const conv = await getConversationForUser(convId, meId);
  if (!conv) return { error: "Suhbat topilmadi", status: 404 as const };
  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== convId) {
    return { error: "Xabar topilmadi", status: 404 as const };
  }
  if (msg.senderId !== meId) {
    return { error: "Faqat öz xabaringizni özgartira olasiz", status: 403 as const };
  }
  if (msg.deletedAt) {
    return { error: "Xabar öçirilgan", status: 400 as const };
  }
  return { msg, conv };
}

const editSchema = z.object({ body: z.string().trim().min(1).max(8000) });

/** Xabarni tahrirlash — faqat o'z xabari, web bilan bir xil mantiq. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, msgId } = await params;
  const me = auth.userId;

  const found = await loadOwn(id, msgId, me);
  if ("error" in found) return mobileJson({ error: found.error }, { status: found.status });

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Matn böş bölmasin" }, { status: 400 });
  if (parsed.data.body === found.msg.body) {
    return mobileJson({ message: await toClientMessage(found.msg, me) });
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.messageRevision.create({ data: { messageId: msgId, body: found.msg.body } });
    return tx.message.update({ where: { id: msgId }, data: { body: parsed.data.body, editedAt: new Date() } });
  });

  publishToConversation(id, { type: "edit", message: await toSerializedMessage(updated) });

  return mobileJson({ message: await toClientMessage(updated, me) });
}

/** Xabarni o'chirish — faqat o'z xabari, web bilan bir xil mantiq. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id, msgId } = await params;
  const me = auth.userId;

  const found = await loadOwn(id, msgId, me);
  if ("error" in found) return mobileJson({ error: found.error }, { status: found.status });

  const updated = await db.message.update({ where: { id: msgId }, data: { deletedAt: new Date() } });

  publishToConversation(id, { type: "delete", messageId: msgId, updatedAt: updated.updatedAt.toISOString() });

  return mobileJson({ ok: true });
}
