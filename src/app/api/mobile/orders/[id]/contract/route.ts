import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";
import { createMessage, getOrCreateConversation } from "@/lib/chat";
import { deliverMessage } from "@/lib/chat-notify";
import { logActivity } from "@/lib/activity";
import { shortDateTime } from "@/lib/date";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  preparerId: z.string().min(1),
  amount: z.coerce.number().int().positive().max(1_000_000_000),
  note: z.string().trim().max(4000).optional(),
  deadline: z.string().datetime().optional(),
});

/** Buyurtmachi tayyorlovchiga shartnoma yuboradi — web bilan bir xil mantiq (eskrou). */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const me = auth.userId;

  const restriction = await getRestriction(me);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: parsed.error.issues[0]?.message ?? "Ma'lumot noto'g'ri" }, { status: 400 });
  }
  const { preparerId, amount, note, deadline } = parsed.data;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (order.ordererId !== me) {
    return mobileJson({ error: "Faqat buyurtma egasi" }, { status: 403 });
  }
  if (order.status !== "OPEN") {
    return mobileJson({ error: "Buyurtma allaqachon jarayonda" }, { status: 400 });
  }
  // shartnoma muddati: tanlanmagan bo'lsa — buyurtma muddati
  const dl = deadline ? new Date(deadline) : order.deadline;
  if (!dl || dl.getTime() <= Date.now()) {
    return mobileJson(
      { error: "Shartnoma muddatini (sana va vaqt) belgilang — kelajakdagi vaqt bo'lsin" },
      { status: 400 },
    );
  }

  const offer = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId } },
  });
  if (!offer) {
    return mobileJson({ error: "Bu tayyorlovchi taklif yubormagan" }, { status: 400 });
  }

  const orderer = await db.user.findUnique({
    where: { id: me },
    select: { balance: true, login: true, name: true, firstName: true, lastName: true, email: true },
  });
  if (!orderer || orderer.balance < amount) {
    return mobileJson(
      { error: "Hisobingizda yetarli mablag' yo'q. Avval Hamyon bo'limidan hisobingizni to'ldiring." },
      { status: 400 },
    );
  }

  const contract = await db.$transaction(async (tx) => {
    const prev = await tx.contract.findMany({ where: { orderId: id, status: "SENT" } });
    for (const p of prev) {
      await tx.contract.update({
        where: { id: p.id },
        data: { status: "CANCELLED", resolvedAt: new Date(), refundAmount: p.amount },
      });
      await tx.user.update({ where: { id: p.ordererId }, data: { balance: { increment: p.amount } } });
      await tx.walletTransaction.create({
        data: {
          userId: p.ordererId,
          type: "REFUND",
          amount: p.amount,
          method: "ESCROW",
          note: "Shartnoma almashtirildi — bloklangan mablag' qaytdi",
        },
      });
    }

    await tx.user.update({ where: { id: me }, data: { balance: { decrement: amount } } });
    await tx.walletTransaction.create({
      data: {
        userId: me,
        type: "HOLD",
        amount,
        method: "ESCROW",
        note: `Shartnoma bo'yicha bloklandi (buyurtma: ${order.title})`,
      },
    });

    return tx.contract.create({
      data: {
        orderId: id,
        ordererId: me,
        preparerId,
        amount,
        note: note || null,
        deadline: dl,
      },
    });
  });

  const conv = await getOrCreateConversation(me, preparerId, id);
  const msg = await createMessage({
    conversationId: conv.id,
    senderId: me,
    body:
      `📄 Shartnoma yuborildi. Kelishilgan summa: ${amount.toLocaleString("ru-RU")} so'm ` +
      `(hisobingizdan bloklandi, ish yakunlangach tayyorlovchiga o'tadi).` +
      (note ? `\n\nTavsif: ${note}` : "") +
      `\nTopshirish muddati: ${shortDateTime(dl)}.` +
      `\n\nQabul qilsangiz, ish boshlanadi. Imzolangandan keyin shartnomani faqat ikki tomon roziligi bilan bekor qilish mumkin.`,
    system: true,
  });
  await deliverMessage(msg);

  await logActivity(
    me,
    "CONTRACT_SEND",
    `Shartnoma yubordi: «${order.title}» — ${amount.toLocaleString("ru-RU")} so'm (mobil ilova)`,
    { orderId: id, contractId: contract.id, amount },
  );
  const preparer = await db.user.findUnique({
    where: { id: preparerId },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "contracts",
    "📄 Shartnoma yuborildi (mobil)",
    [
      `«${order.title}»`,
      `Summa: ${amount.toLocaleString("ru-RU")} so'm`,
      `Buyurtmachi: ${userLabel(orderer)}`,
      `Tayyorlovchi: ${userLabel(preparer)}`,
      note ? `Tavsif: ${note}` : "",
      `Muddat: ${shortDateTime(dl)}`,
      `Shartnoma ID: ${contract.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return mobileJson({ contract: { id: contract.id }, conversationId: conv.id }, { status: 201 });
}
