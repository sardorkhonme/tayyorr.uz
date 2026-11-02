import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";

export interface Person {
  id: string;
  name: string;
  login: string | null;
  avatar: string | null;
}

function personName(u: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  login: string | null;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.name || u.login || "Foydalanuvchi";
}

/** Ommaviy xabar bo'yicha: kim yoqtirdi / yoqtirmadi / ko'rdi. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const supportId = await getSupportUserId();

  const rows = await db.message.findMany({
    where: { broadcastId: id },
    select: {
      id: true,
      readAt: true,
      conversation: { select: { userAId: true, userBId: true } },
    },
  });

  const recipientOf = (r: (typeof rows)[number]) =>
    r.conversation.userAId === supportId
      ? r.conversation.userBId
      : r.conversation.userAId;

  const msgIds = rows.map((r) => r.id);
  const readIds = rows.filter((r) => r.readAt).map(recipientOf);

  const reactions = msgIds.length
    ? await db.messageReaction.findMany({
        where: { messageId: { in: msgIds } },
        select: { userId: true, value: true },
      })
    : [];
  const likeIds = reactions.filter((r) => r.value === "LIKE").map((r) => r.userId);
  const dislikeIds = reactions
    .filter((r) => r.value === "DISLIKE")
    .map((r) => r.userId);

  const allIds = [...new Set([...readIds, ...likeIds, ...dislikeIds])];
  const users = allIds.length
    ? await db.user.findMany({
        where: { id: { in: allIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          login: true,
          avatarUrl: true,
          image: true,
        },
      })
    : [];

  const map = new Map<string, Person>(
    users.map((u) => [
      u.id,
      {
        id: u.id,
        name: personName(u),
        login: u.login,
        avatar: u.avatarUrl ?? u.image ?? null,
      },
    ]),
  );
  const pick = (ids: string[]) =>
    ids.map((x) => map.get(x)).filter((x): x is Person => !!x);

  return NextResponse.json({
    recipients: rows.length,
    readCount: readIds.length,
    likeCount: likeIds.length,
    dislikeCount: dislikeIds.length,
    reads: pick(readIds),
    likes: pick(likeIds),
    dislikes: pick(dislikeIds),
  });
}
