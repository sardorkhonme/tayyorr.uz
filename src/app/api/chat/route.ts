import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { stripSource, VISIBLE_ON_UZ } from "@/lib/message-source";

/** Mening barcha suhbatlarim: oxirgi xabar + o'qilmaganlar soni. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const me = session.user.id;

  const convs = await db.conversation.findMany({
    where: {
      hiddenFromUsersAt: null,
      deletedByUsersAt: null,
      OR: [{ userAId: me }, { userBId: me }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, login: true, avatarUrl: true, image: true } },
      userB: { select: { id: true, name: true, login: true, avatarUrl: true, image: true } },
      messages: { where: VISIBLE_ON_UZ, orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const withMeta = await Promise.all(
    convs.map(async (c) => {
      const other = c.userAId === me ? c.userB : c.userA;
      const unread = await db.message.count({
        where: { conversationId: c.id, senderId: { not: me }, readAt: null, ...VISIBLE_ON_UZ },
      });
      const last = c.messages[0];
      return {
        id: c.id,
        orderId: c.orderId,
        other: {
          id: other.id,
          name: other.name ?? other.login ?? "Foydalanuvçi",
          login: other.login,
          image: other.avatarUrl ?? other.image ?? null,
        },
        lastMessage: last
          ? { body: stripSource(last.body), createdAt: last.createdAt, mine: last.senderId === me }
          : null,
        lastMessageAt: c.lastMessageAt,
        unread,
      };
    }),
  );

  return NextResponse.json({ conversations: withMeta });
}
