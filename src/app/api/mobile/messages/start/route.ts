import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getOrCreateConversation, blockState } from "@/lib/chat";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  userId: z.string().min(1),
  orderId: z.string().optional(),
});

/** Boshqa foydalanuvchi bilan suhbatni olish yoki yaratish — web bilan bir xil mantiq. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const { userId, orderId } = parsed.data;

  if (userId === me) {
    return mobileJson({ error: "Özingiz bilan suhbat bölmaydi" }, { status: 400 });
  }

  const restriction = await getRestriction(me);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const other = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!other) return mobileJson({ error: "Foydalanuvçi topilmadi" }, { status: 404 });

  const bs = await blockState(me, userId);
  if (bs.iBlocked) return mobileJson({ error: "Siz bu foydalanuvçini bloklagansiz." }, { status: 403 });
  if (bs.blockedMe) return mobileJson({ error: "Bu foydalanuvçi sizni bloklagan." }, { status: 403 });

  const conv = await getOrCreateConversation(me, userId, orderId);
  return mobileJson({ conversationId: conv.id });
}
