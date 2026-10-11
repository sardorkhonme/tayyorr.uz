import { db } from "@/lib/db";

/** Juftlikni doim bir xil tartibda saqlaymiz. */
export function orderedPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(
  meId: string,
  otherId: string,
  orderId?: string | null,
) {
  if (meId === otherId) throw new Error("O'zingiz bilan suhbat bo'lmaydi");
  const [userAId, userBId] = orderedPair(meId, otherId);

  const existing = await db.conversation.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
  });
  if (existing) {
    // foydalanuvchi o'chirgan bo'lsa — qayta yozилганда tiklaymiz
    const data: { orderId?: string; deletedByUsersAt?: null } = {};
    if (orderId && !existing.orderId) data.orderId = orderId;
    if (existing.deletedByUsersAt) data.deletedByUsersAt = null;
    if (Object.keys(data).length) {
      return db.conversation.update({ where: { id: existing.id }, data });
    }
    return existing;
  }

  return db.conversation.create({
    data: { userAId, userBId, orderId: orderId ?? null },
  });
}

/** Suhbat a'zosi ekanini tekshiradi; admin yashirgan yoki foydalanuvchi o'chirgan bo'lsa null. */
export async function getConversationForUser(convId: string, userId: string) {
  const conv = await db.conversation.findUnique({ where: { id: convId } });
  if (!conv) return null;
  if (conv.userAId !== userId && conv.userBId !== userId) return null;
  if (conv.hiddenFromUsersAt || conv.deletedByUsersAt) return null;
  return conv;
}

export function otherUserId(
  conv: { userAId: string; userBId: string },
  meId: string,
) {
  return conv.userAId === meId ? conv.userBId : conv.userAId;
}

/** Ikki foydalanuvchi o'rtasidagi bloklash holati. */
export async function blockState(a: string, b: string) {
  const rows = await db.block.findMany({
    where: {
      OR: [
        { blockerId: a, blockedId: b },
        { blockerId: b, blockedId: a },
      ],
    },
  });
  return {
    iBlocked: rows.some((r) => r.blockerId === a),
    blockedMe: rows.some((r) => r.blockerId === b),
  };
}

/** Xabar yaratadi va suhbatning lastMessageAt'ini yangilaydi. */
export async function createMessage(opts: {
  conversationId: string;
  senderId: string;
  body?: string;
  system?: boolean;
  /** tizim xabari tegishli buyurtma (tugma shu buyurtmani ochadi) */
  orderId?: string | null;
  replyToId?: string | null;
  broadcastId?: string | null;
  file?: {
    key: string;
    name: string;
    type: string;
    size: number;
  } | null;
}) {
  // reply faqat shu suhbatdagi xabarga bo'lsin
  let replyToId: string | null = null;
  if (opts.replyToId) {
    const parent = await db.message.findUnique({
      where: { id: opts.replyToId },
      select: { conversationId: true },
    });
    if (parent?.conversationId === opts.conversationId) replyToId = opts.replyToId;
  }

  return db.$transaction(async (tx) => {
    const m = await tx.message.create({
      data: {
        conversationId: opts.conversationId,
        senderId: opts.senderId,
        body: opts.body ?? "",
        system: opts.system ?? false,
        orderId: opts.orderId ?? null,
        replyToId,
        broadcastId: opts.broadcastId ?? null,
        fileKey: opts.file?.key ?? null,
        fileName: opts.file?.name ?? null,
        fileType: opts.file?.type ?? null,
        fileSize: opts.file?.size ?? null,
      },
    });
    await tx.conversation.update({
      where: { id: opts.conversationId },
      data: { lastMessageAt: m.createdAt },
    });
    return m;
  });
}
