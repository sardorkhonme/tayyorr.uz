import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { reactionChips, toEmoji } from "@/lib/reactions";

function personName(u: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  login: string | null;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.name || u.login || "Foydalanuvçi";
}

/** Bitta xabarga kim qaysi reaksiyani bosgan (emoji bo'yicha; eski likes/dislikes ham). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id, msgId } = await params;
  const msg = await db.message.findUnique({ where: { id: msgId } });
  if (!msg || msg.conversationId !== id) {
    return NextResponse.json({ error: "Xabar topilmadi" }, { status: 404 });
  }

  const rows = await db.messageReaction.findMany({
    where: { messageId: msgId },
    select: {
      value: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          name: true,
          login: true,
          avatarUrl: true,
          image: true,
        },
      },
    },
  });

  const shape = (emoji: string) =>
    rows
      .filter((r) => toEmoji(r.value) === emoji)
      .map((r) => ({
        id: r.user.id,
        name: personName(r.user),
        login: r.user.login,
        avatar: r.user.avatarUrl ?? r.user.image ?? null,
      }));

  const groups = reactionChips(rows.map((r) => ({ userId: r.user.id, value: r.value }))).map((c) => ({
    emoji: c.emoji,
    count: c.count,
    users: shape(c.emoji),
  }));

  return NextResponse.json({ groups, likes: shape("👍"), dislikes: shape("👎") });
}
