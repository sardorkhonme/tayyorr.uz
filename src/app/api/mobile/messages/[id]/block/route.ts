import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getConversationForUser, otherUserId, blockState } from "@/lib/chat";
import { getSupportUserId } from "@/lib/support";
import { logActivity } from "@/lib/activity";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ action: z.enum(["BLOCK", "UNBLOCK"]) });

/** Suhbatdoshni bloklash/blokdan chiqarish — web bilan bir xil mantiq. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const other = otherUserId(conv, me);
  const supportId = await getSupportUserId();
  if (other === supportId) {
    return mobileJson({ error: "Supportʼni bloklab bölmaydi" }, { status: 400 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri amal" }, { status: 400 });

  if (parsed.data.action === "BLOCK") {
    await db.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: other } },
      update: {},
      create: { blockerId: me, blockedId: other },
    });
  } else {
    await db.block.delete({ where: { blockerId_blockedId: { blockerId: me, blockedId: other } } }).catch(() => {});
  }

  await logActivity(
    me,
    parsed.data.action === "BLOCK" ? "USER_BLOCK" : "USER_UNBLOCK",
    parsed.data.action === "BLOCK" ? "Suhbatdoşni blokladi (mobil ilova)" : "Suhbatdoşni blokdan çiqardi (mobil ilova)",
    { otherId: other, conversationId: conv.id },
  );

  return mobileJson({ ok: true, ...(await blockState(me, other)) });
}
