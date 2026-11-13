import { NextResponse } from "next/server";
import { z } from "zod";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { publishToConversation } from "@/lib/chat-bus";

const schema = z.object({ ids: z.array(z.string().min(1).max(64)).min(1).max(200) });

/** Bir nechta xabarni bittada öçiriş — har biri yakka DELETE dagi qoida bilan: faqat öz xabari. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const me = actor.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  }
  const ids = [...new Set(parsed.data.ids)];

  const conv = await conversationForActor(id, actor);
  if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

  const rows = await db.message.findMany({
    where: { id: { in: ids }, conversationId: id },
    select: { id: true, senderId: true, deletedAt: true },
  });
  if (rows.length !== ids.length) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }
  // admin panel (Support nomidan, admin sessiyasi tekşirilgan) — suhbatdagi istalgan xabarni öçira oladi
  if (!actor.support && rows.some((m) => m.senderId !== me)) {
    return NextResponse.json({ error: "Faqat öz xabaringizni öçira olasiz" }, { status: 403 });
  }
  const todo = rows.filter((m) => !m.deletedAt).map((m) => m.id);

  const now = new Date();
  const updated = await db.$transaction(
    todo.map((msgId) =>
      db.message.update({
        where: { id: msgId },
        data: { deletedAt: now },
        select: { id: true, updatedAt: true },
      }),
    ),
  );
  for (const u of updated) {
    publishToConversation(id, {
      type: "delete",
      messageId: u.id,
      updatedAt: u.updatedAt.toISOString(),
    });
  }

  return NextResponse.json({ ok: true, ids: updated.map((u) => u.id) });
}
