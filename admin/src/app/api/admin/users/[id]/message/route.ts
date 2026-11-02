import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";
import { deliverMessage } from "@/lib/chat-notify";

const schema = z.object({ body: z.string().trim().min(1).max(4000) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Xabar bo'sh bo'lmasin" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id }, select: { id: true } });
  if (!user) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const supportId = await getSupportUserId();
  const conv = await getOrCreateConversation(supportId, id);
  const m = await createMessage({
    conversationId: conv.id,
    senderId: supportId,
    body: parsed.data.body,
    system: false, // support xabari — oddiy bubble
  });
  await deliverMessage(m);

  return NextResponse.json({ ok: true, conversationId: conv.id });
}
