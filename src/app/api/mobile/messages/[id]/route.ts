import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { chatContractPins } from "@/lib/chat-pins";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import {
  getConversationForUser,
  createMessage,
  otherUserId,
  blockState,
} from "@/lib/chat";
import { toClientMessages, toClientMessage } from "@/lib/chat-messages";
import { deliverMessage } from "@/lib/chat-notify";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { getSupportUserId } from "@/lib/support";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bitta suhbat: boshqa foydalanuvchi + xabarlar + faol shartnoma(lar) — web bilan bir xil. */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const url = new URL(req.url);
  const since = url.searchParams.get("since");

  const rows = await db.message.findMany({
    where: {
      conversationId: id,
      ...(since ? { updatedAt: { gt: new Date(Number(since)) } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 300,
    include: { reactions: true },
  });

  const otherId = otherUserId(conv, me);
  const [other, bs, activeContracts] = await Promise.all([
    db.user.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        name: true,
        login: true,
        avatarUrl: true,
        image: true,
        isSupport: true,
        lastSeenAt: true,
      },
    }),
    blockState(me, otherId),
    chatContractPins(me, otherId),
  ]);
  const hidden = bs.blockedMe && !other?.isSupport;

  const messages = await toClientMessages(rows, me);

  return mobileJson({
    conversation: { id: conv.id, orderId: conv.orderId },
    blockedMe: bs.blockedMe,
    blockedByMe: bs.iBlocked,
    other: other && {
      id: other.id,
      name: other.name ?? other.login ?? "Foydalanuvchi",
      login: other.login,
      image: hidden ? null : (other.avatarUrl ?? other.image ?? null),
      isSupport: other.isSupport,
      lastSeenAt: hidden || !other.lastSeenAt ? null : other.lastSeenAt.toISOString(),
    },
    activeContracts,
    messages,
  });
}

const sendSchema = z.object({
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
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const parsed = sendSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success || (!parsed.data.body && !parsed.data.file)) {
    return mobileJson({ error: "Xabar yoki fayl bo'lishi kerak" }, { status: 400 });
  }

  const supportId = await getSupportUserId();
  const isSupportThread = conv.userAId === supportId || conv.userBId === supportId;

  const restriction = await getRestriction(me);
  if (restriction && !isSupportThread) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  if (!isSupportThread) {
    const bs = await blockState(me, otherUserId(conv, me));
    if (bs.iBlocked) {
      return mobileJson(
        { error: "Siz bu foydalanuvchini bloklagansiz. Avval blokdan chiqaring." },
        { status: 403 },
      );
    }
    if (bs.blockedMe) {
      return mobileJson({ error: 'Bu foydalanuvchi sizni bloklagan.' }, { status: 403 });
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

  return mobileJson({ message: await toClientMessage(msg, me) }, { status: 201 });
}

/** Foydalanuvchi suhbatni ikki tomondan o'chiradi (adminda saqlanadi) — web bilan bir xil. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const me = auth.userId;

  const conv = await getConversationForUser(id, me);
  if (!conv) return mobileJson({ error: "Suhbat topilmadi" }, { status: 404 });

  const otherId = otherUserId(conv, me);
  const other = await db.user.findUnique({ where: { id: otherId }, select: { isSupport: true } });
  if (other?.isSupport) {
    return mobileJson({ error: "«tayyorr.uz support» suhbatini o'chirib bo'lmaydi" }, { status: 400 });
  }

  await db.conversation.update({ where: { id }, data: { deletedByUsersAt: new Date() } });
  return mobileJson({ ok: true });
}
