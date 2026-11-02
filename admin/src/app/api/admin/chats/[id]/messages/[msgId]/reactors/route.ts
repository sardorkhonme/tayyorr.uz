import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

function personName(u: {
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  login: string | null;
}): string {
  const full = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
  return full || u.name || u.login || "Foydalanuvchi";
}

/** Bitta xabarga kim 👍 / 👎 bosgan. */
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

  const shape = (v: "LIKE" | "DISLIKE") =>
    rows
      .filter((r) => r.value === v)
      .map((r) => ({
        id: r.user.id,
        name: personName(r.user),
        login: r.user.login,
        avatar: r.user.avatarUrl ?? r.user.image ?? null,
      }));

  return NextResponse.json({ likes: shape("LIKE"), dislikes: shape("DISLIKE") });
}
