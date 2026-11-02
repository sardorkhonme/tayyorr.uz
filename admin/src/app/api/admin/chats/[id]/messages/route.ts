import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { toClientMessages } from "@/lib/chat-messages";
import { getSupportUserId } from "@/lib/support";

/** Admin uchun suhbat xabarlari (support = "mine"). */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const conv = await db.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const supportId = await getSupportUserId();
  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const rows = await db.message.findMany({
    where: {
      conversationId: id,
      ...(since ? { updatedAt: { gt: new Date(Number(since)) } } : {}),
    },
    // `since` bo'lmasa — eng yangi 300 ta (eskilari emas), keyin to'g'ri tartibda
    orderBy: { createdAt: since ? "asc" : "desc" },
    take: 300,
    include: { reactions: true },
  });
  if (!since) rows.reverse();

  // admin ko'rdi -> foydalanuvchi xabarlarini o'qilgan deb belgilaymiz
  await db.message.updateMany({
    where: { conversationId: id, senderId: { not: supportId }, readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({
    messages: await toClientMessages(rows, supportId, { forAdmin: true }),
  });
}
