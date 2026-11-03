import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getOrCreateConversation, blockState } from "@/lib/chat";
import { getRestriction, restrictionText } from "@/lib/restriction";

const schema = z.object({
  userId: z.string().min(1),
  orderId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  }
  const { userId, orderId } = parsed.data;

  if (userId === session.user.id) {
    return NextResponse.json(
      { error: "Özingiz bilan suhbat bölmaydi" },
      { status: 400 },
    );
  }

  const restriction = await getRestriction(session.user.id);
  if (restriction) {
    return NextResponse.json({ error: restrictionText(restriction) }, { status: 403 });
  }

  const other = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!other) {
    return NextResponse.json({ error: "Foydalanuvçi topilmadi" }, { status: 404 });
  }

  const bs = await blockState(session.user.id, userId);
  if (bs.iBlocked) {
    return NextResponse.json(
      { error: "Siz bu foydalanuvçini bloklagansiz." },
      { status: 403 },
    );
  }
  if (bs.blockedMe) {
    return NextResponse.json(
      { error: "Bu foydalanuvçi sizni bloklagan." },
      { status: 403 },
    );
  }

  const conv = await getOrCreateConversation(session.user.id, userId, orderId);
  return NextResponse.json({ conversationId: conv.id });
}
