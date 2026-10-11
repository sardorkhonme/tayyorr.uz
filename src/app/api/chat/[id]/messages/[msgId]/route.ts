import { NextResponse } from "next/server";
import { z } from "zod";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";
import { toClientMessage, toSerializedMessage } from "@/lib/chat-messages";

async function loadOwn(convId: string, msgId: string, actor: { id: string; support: boolean }) {
  const meId = actor.id;
  const conv = await conversationForActor(convId, actor);
  if (!conv) return { error: "Suhbat topilmadi", status: 404 as const };
  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== convId) {
    return { error: "Xabar topilmadi", status: 404 as const };
  }
  if (msg.senderId !== meId) {
    return { error: "Faqat o'z xabaringizni o'zgartira olasiz", status: 403 as const };
  }
  if (msg.deletedAt) {
    return { error: "Xabar o'chirilgan", status: 400 as const };
  }
  return { msg, conv };
}

const editSchema = z.object({ body: z.string().trim().min(1).max(8000) });

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id, msgId } = await params;
  const me = actor.id;

  const found = await loadOwn(id, msgId, actor);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Matn bo'sh bo'lmasin" }, { status: 400 });
  }
  if (parsed.data.body === found.msg.body) {
    return NextResponse.json({ message: await toClientMessage(found.msg, me) });
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.messageRevision.create({
      data: { messageId: msgId, body: found.msg.body },
    });
    return tx.message.update({
      where: { id: msgId },
      data: { body: parsed.data.body, editedAt: new Date() },
    });
  });

  publishToConversation(id, { type: "edit", message: await toSerializedMessage(updated) });

  return NextResponse.json({ message: await toClientMessage(updated, me) });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id, msgId } = await params;
  const me = actor.id;

  const found = await loadOwn(id, msgId, actor);
  if ("error" in found) {
    return NextResponse.json({ error: found.error }, { status: found.status });
  }

  const updated = await db.message.update({
    where: { id: msgId },
    data: { deletedAt: new Date() },
  });

  publishToConversation(id, {
    type: "delete",
    messageId: msgId,
    updatedAt: updated.updatedAt.toISOString(),
  });

  return NextResponse.json({ ok: true });
}
