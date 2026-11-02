import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConversationForUser, otherUserId, blockState } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";
import { logActivity } from "@/lib/activity";

const schema = z.object({ action: z.enum(["BLOCK", "UNBLOCK"]) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const me = session.user.id;

  const conv = await getConversationForUser(id, me);
  if (!conv) return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });

  const other = otherUserId(conv, me);
  const supportId = await getSupportUserId();
  if (other === supportId) {
    return NextResponse.json({ error: "Support'ni bloklab bo'lmaydi" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri amal" }, { status: 400 });
  }

  if (parsed.data.action === "BLOCK") {
    await db.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: other } },
      update: {},
      create: { blockerId: me, blockedId: other },
    });
  } else {
    await db.block
      .delete({ where: { blockerId_blockedId: { blockerId: me, blockedId: other } } })
      .catch(() => {});
  }

  await logActivity(
    me,
    parsed.data.action === "BLOCK" ? "USER_BLOCK" : "USER_UNBLOCK",
    parsed.data.action === "BLOCK"
      ? "Suhbatdoshni blokladi"
      : "Suhbatdoshni blokdan chiqardi",
    { otherId: other, conversationId: conv.id },
  );

  return NextResponse.json({ ok: true, ...(await blockState(me, other)) });
}
