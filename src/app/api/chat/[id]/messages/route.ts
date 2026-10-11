import { NextResponse } from "next/server";
import { z } from "zod";

import { chatActor, conversationForActor } from "@/lib/chat-actor";
import {
  createMessage,
  otherUserId,
  blockState,
} from "@/lib/chat";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { getSupportUserId } from "@/lib/support";
import { toClientMessage } from "@/lib/chat-messages";
import { deliverMessage } from "@/lib/chat-notify";

const schema = z.object({
  body: z.string().trim().max(8000).optional(),
  replyToId: z.string().optional(),
  file: z
    .object({
      key: z.string().min(1),
      name: z.string().min(1).max(300),
      type: z.string().min(1).max(200),
      size: z.number().int().nonnegative(),
    })
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await chatActor(req);
  if (!actor) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;
  const me = actor.id;

  const conv = await conversationForActor(id, actor);
  if (!conv) {
    return NextResponse.json({ error: "Suhbat topilmadi" }, { status: 404 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.body && !parsed.data.file)) {
    return NextResponse.json(
      { error: "Xabar yoki fayl bo'lishi kerak" },
      { status: 400 },
    );
  }

  const supportId = await getSupportUserId();
  const isSupportThread =
    conv.userAId === supportId || conv.userBId === supportId;

  // cheklangan foydalanuvchi faqat "tayyorr.uz support" bilan yozisha oladi
  const restriction = await getRestriction(me);
  if (restriction && !isSupportThread) {
    return NextResponse.json({ error: restrictionText(restriction) }, { status: 403 });
  }

  // bloklash
  if (!isSupportThread) {
    const bs = await blockState(me, otherUserId(conv, me));
    if (bs.iBlocked) {
      return NextResponse.json(
        { error: "Siz bu foydalanuvchini bloklagansiz. Avval blokdan chiqaring." },
        { status: 403 },
      );
    }
    if (bs.blockedMe) {
      return NextResponse.json(
        { error: "Bu foydalanuvchi sizni bloklagan." },
        { status: 403 },
      );
    }
  }

  const msg = await createMessage({
    conversationId: id,
    senderId: me,
    body: parsed.data.body ?? "",
    replyToId: parsed.data.replyToId ?? null,
    file: parsed.data.file ?? null,
  });

  await deliverMessage(msg);

  return NextResponse.json({ message: await toClientMessage(msg, me) });
}
