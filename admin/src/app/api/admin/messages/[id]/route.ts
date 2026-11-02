import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";
import { publishToConversation } from "@/lib/chat-bus";
import { toClientMessage, toSerializedMessage } from "@/lib/chat-messages";

/** Bitta xabarni butunlay o'chiradi (admin uchun ham qolmaydi). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const msg = await db.message.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await db.message.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

const editSchema = z.object({ body: z.string().trim().min(1).max(8000) });

/** Admin xabar matnini tahrirlaydi (support suhbatlarida o'z xabari). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const supportId = await getSupportUserId();

  const msg = await db.message.findUnique({ where: { id } });
  if (!msg) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (msg.deletedAt) {
    return NextResponse.json({ error: "Xabar o'chirilgan" }, { status: 400 });
  }

  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Matn bo'sh bo'lmasin" }, { status: 400 });
  }
  if (parsed.data.body === msg.body) {
    return NextResponse.json({
      message: await toClientMessage(msg, supportId, { forAdmin: true }),
    });
  }

  const updated = await db.$transaction(async (tx) => {
    await tx.messageRevision.create({ data: { messageId: id, body: msg.body } });
    return tx.message.update({
      where: { id },
      data: { body: parsed.data.body, editedAt: new Date() },
    });
  });

  publishToConversation(msg.conversationId, {
    type: "edit",
    message: await toSerializedMessage(updated),
  });

  return NextResponse.json({
    message: await toClientMessage(updated, supportId, { forAdmin: true }),
  });
}
