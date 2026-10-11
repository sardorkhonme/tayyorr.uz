import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { chatActor, conversationForActor } from "@/lib/chat-actor";
import { db } from "@/lib/db";
import { getConversationForUser, otherUserId, blockState } from "@/lib/chat";
import { toClientMessages } from "@/lib/chat-messages";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const me = actor.id;

  const conv = await conversationForActor(id, actor);
  if (!conv) {
    return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
  }

  const url = new URL(req.url);
  // `since` = ko'rilgan eng katta updatedAt (ms). Yangi + tahrirlangan + o'chirilgan xabarlarni qaytaradi.
  const since = url.searchParams.get("since");

  const rows = await db.message.findMany({
    where: {
      conversationId: id,
      ...(since ? { updatedAt: { gt: new Date(Number(since)) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { reactions: true },
  });

  const otherId = otherUserId(conv, me);
  const [other, bs] = await Promise.all([
    db.user.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        name: true,
        login: true,
        avatarUrl: true,
        image: true,
        isSupport: true,
        lastSeenAt: true,
      },
    }),
    blockState(me, otherId),
  ]);
  const hidden = bs.blockedMe && !other?.isSupport;

  return NextResponse.json({
    conversation: { id: conv.id, orderId: conv.orderId },
    blockedMe: bs.blockedMe,
    blockedByMe: bs.iBlocked,
    other: other && {
      id: other.id,
      name: other.name ?? other.login ?? "Foydalanuvchi",
      login: other.login,
      image: hidden ? null : other.avatarUrl ?? other.image ?? null,
      lastSeenAt:
        hidden || !other.lastSeenAt ? null : other.lastSeenAt.toISOString(),
    },
    messages: await toClientMessages(rows, me),
  });
}

/** Foydalanuvchi suhbatni ikki tomondan o'chiradi (adminда saqlanadi). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const conv = await getConversationForUser(id, session.user.id);
  if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

  // support suhbatini o'chirib bo'lmaydi
  const otherId = otherUserId(conv, session.user.id);
  const other = await db.user.findUnique({
    where: { id: otherId },
    select: { isSupport: true },
  });
  if (other?.isSupport) {
    return NextResponse.json(
      { error: "«tayyorr.uz support» suhbatini o'chirib bo'lmaydi" },
      { status: 400 },
    );
  }

  await db.conversation.update({
    where: { id },
    data: { deletedByUsersAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
