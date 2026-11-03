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
    return mobileJson({ error: parsed.error.issues[0]?.message ?? "Maʼlumot notöğri" }, { status: 400 });
  }
  const { preparerId, amount, note, deadline } = parsed.data;

  const order = await db.order.findUnique({ where: { id } });
  if (!order) return mobileJson({ error: "Topilmadi" }, { status: 404 });
  if (order.ordererId !== me) {
    return mobileJson({ error: "Faqat buyurtma egasi" }, { status: 403 });
  }
  if (order.status !== "OPEN") {
    return mobileJson({ error: "Buyurtma allaqaçon jarayonda" }, { status: 400 });
  }
  // shartnoma muddati: tanlanmagan bo'lsa — buyurtma muddati
  const dl = deadline ? new Date(deadline) : order.deadline;
  if (!dl || dl.getTime() <= Date.now()) {
    return mobileJson(
      { error: "Şartnoma muddatini (sana va vaqt) belgilang — kelajakdagi vaqt bölsin" },
      { status: 400 },
    );
  }

  const offer = await db.offer.findUnique({
    where: { orderId_preparerId: { orderId: id, preparerId } },
  });
  if (!offer) {
    return mobileJson({ error: "Bu tayyorlovçi taklif yubormagan" }, { status: 400 });
  }

  const orderer = await db.user.findUnique({
    where: { id: me },
    select: { balance: true, login: true, name: true, firstName: true, lastName: true, email: true },
  });
  if (!orderer || orderer.balance < amount) {
    return mobileJson(
      { error: "Hisobingizda yetarli mablağ yöq. Avval Hamyon bölimidan hisobingizni töldiring." },
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
          note: "Şartnoma almaştirildi — bloklangan mablağ qaytdi",
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
        note: `Şartnoma böyiça bloklandi (buyurtma: ${order.title})`,
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
      `📄 Şartnoma yuborildi. Kelişilgan summa: ${amount.toLocaleString("ru-RU")} söm ` +
      `(hisobingizdan bloklandi, iş yakunlangaç tayyorlovçiga ötadi).` +
      (note ? `\n\nTavsif: ${note}` : "") +
      `\nTopşiriş muddati: ${shortDateTime(dl)}.` +
      `\n\nQabul qilsangiz, iş boşlanadi. Imzolangandan keyin şartnomani faqat ikki tomon roziligi bilan bekor qiliş mumkin.`,
    system: true,
    orderId: id,
  });
  await deliverMessage(msg);

  await logActivity(
    me,
    "CONTRACT_SEND",
    `Şartnoma yubordi: «${order.title}» — ${amount.toLocaleString("ru-RU")} söm (mobil ilova)`,
    { orderId: id, contractId: contract.id, amount },
  );
  const preparer = await db.user.findUnique({
    where: { id: preparerId },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "contracts",
    "📄 Şartnoma yuborildi (mobil)",
    [
      `«${order.title}»`,
      `Summa: ${amount.toLocaleString("ru-RU")} söm`,
      `Buyurtmaçi: ${userLabel(orderer)}`,
      `Tayyorlovçi: ${userLabel(preparer)}`,
      note ? `Tavsif: ${note}` : "",
      `Muddat: ${shortDateTime(dl)}`,
      `Şartnoma ID: ${contract.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${id}`),
  );

  return mobileJson({ contract: { id: contract.id }, conversationId: conv.id }, { status: 201 });
}
