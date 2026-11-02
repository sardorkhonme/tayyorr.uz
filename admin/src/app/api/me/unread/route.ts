import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { VISIBLE_ON_UZ } from "@/lib/message-source";

/** Foydalanuvchining o'qilmagan xabarlari: umumiy son + suhbatlar bo'yicha. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ total: 0, perConv: {} }, { status: 401 });
  }
  const uid = session.user.id;

  const rows = await db.message.groupBy({
    by: ["conversationId"],
    where: {
      senderId: { not: uid },
      readAt: null,
      ...VISIBLE_ON_UZ,
      conversation: {
        OR: [{ userAId: uid }, { userBId: uid }],
        deletedByUsersAt: null,
        hiddenFromUsersAt: null,
      },
    },
    _count: { _all: true },
  });

  const perConv: Record<string, number> = {};
  let total = 0;
  for (const r of rows) {
    const n = r._count._all;
    perConv[r.conversationId] = n;
    total += n;
  }

  return NextResponse.json(
    { total, perConv },
    { headers: { "Cache-Control": "no-store" } },
  );
}
