import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getSupportUserId } from "@/lib/support";

export { OPTIONS } from "@/lib/mobile-cors";

/** Mening barcha suhbatlarim — web bilan bir xil mantiq. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

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
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const supportId = await getSupportUserId();
  const blockedMeBy = new Set(
    (await db.block.findMany({ where: { blockedId: me }, select: { blockerId: true } })).map((r) => r.blockerId),
  );

  const withMeta = await Promise.all(
    convs.map(async (c) => {
      const other = c.userAId === me ? c.userB : c.userA;
      const unread = await db.message.count({
        where: { conversationId: c.id, senderId: { not: me }, readAt: null },
      });
      const last = c.messages[0];
      return {
        id: c.id,
        other: {
          id: other.id,
          name: other.name ?? other.login ?? "Foydalanuvchi",
          login: other.login,
          image: other.avatarUrl ?? other.image ?? null,
          isSupport: other.id === supportId,
        },
        blockedMe: blockedMeBy.has(other.id) && other.id !== supportId,
        lastMessage: last
          ? { body: last.body, createdAt: last.createdAt.toISOString(), mine: last.senderId === me }
          : null,
        lastMessageAt: c.lastMessageAt.toISOString(),
        unread,
      };
    }),
  );

  // webdagidek: support suhbati doim eng tepada
  withMeta.sort((a, b) => {
    if (a.other.isSupport !== b.other.isSupport) return a.other.isSupport ? -1 : 1;
    return b.lastMessageAt.localeCompare(a.lastMessageAt);
  });

  return mobileJson({ conversations: withMeta });
}
