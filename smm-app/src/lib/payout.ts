import { db } from "@/lib/db";
import { som } from "@/lib/format";
import { adminUserUrl, notifyAdmins, userLabel } from "@/lib/telegram";

/**
 * Kartaga yechib olish — tayyorr.uz dagi bilan bir xil PayoutRequest (admin → "Yechib olish").
 * Komissiya 5%: so'ralgan summa hamyondan yechiladi, kartaga 95% o'tkaziladi.
 */
export const PAYOUT_MIN = 1_000;
export const PAYOUT_COMMISSION_PERCENT = 5;

export const PAYOUT_STATUS: Record<string, string> = {
  PENDING: "Kartaga ötkazilmoqda",
  PAID: "Kartaga ötkazildi",
  REJECTED: "Rad etildi (mablağ qaytarildi)",
  CANCELLED: "Bekor qilindi",
};

export class PayoutError extends Error {}

export function payoutNet(amount: number) {
  const commission = Math.ceil((amount * PAYOUT_COMMISSION_PERCENT) / 100);
  return { commission, net: amount - commission };
}

/** "8600123456789012" -> "8600 **** **** 9012" */
export function maskCard(d: string) {
  return d.length < 8 ? d : `${d.slice(0, 4)} **** **** ${d.slice(-4)}`;
}

export async function requestPayout(userId: string, amount: number, cardRaw: string, cardName?: string) {
  const card = cardRaw.replace(/\D/g, "");
  if (card.length !== 16) throw new PayoutError("Karta raqami 16 raqamdan iborat bölsin");
  if (!Number.isInteger(amount) || amount < PAYOUT_MIN) throw new PayoutError(`Eng kami ${som(PAYOUT_MIN)}`);
  const { commission, net } = payoutNet(amount);

  const payout = await db.$transaction(async (tx) => {
    // shartli yechish — parallel so'rovlarda balans manfiy bo'lmaydi
    const upd = await tx.user.updateMany({
      where: { id: userId, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (upd.count !== 1) throw new PayoutError("Hisobda yetarli mablağ yöq");
    const p = await tx.payoutRequest.create({
      data: { userId, amount, card, cardName: cardName?.trim() || null },
    });
    await tx.walletTransaction.create({
      data: {
        userId,
        type: "PAYOUT",
        status: "PENDING",
        amount,
        method: "CARD",
        note: `Kartaga yeçib olindi — ${maskCard(card)} (tayyorr+, ${PAYOUT_COMMISSION_PERCENT}% komissiya)`,
        meta: { payoutId: p.id, card: maskCard(card), commission, net, source: "plus" },
      },
    });
    return p;
  });

  const u = await db.user.findUnique({
    where: { id: userId },
    select: { login: true, firstName: true, lastName: true, name: true, email: true, walletCode: true, balance: true },
  });
  await db.activityLog
    .create({
      data: {
        userId,
        action: "PAYOUT_REQUEST",
        summary: `Kartaga yeçiş söradi (tayyorr+): ${som(amount)} — ${maskCard(card)}`,
        meta: { amount, payoutId: payout.id, commission, net },
      },
    })
    .catch(() => {});
  await notifyAdmins(
    "payouts",
    "🏧 Yangi yeçib oliş sörovi (tayyorr+)",
    [
      `Foydalanuvçi: ${userLabel(u)}`,
      u?.email ? `Email: ${u.email}` : "",
      u?.walletCode ? `Hisob kodi: ${u.walletCode}` : "",
      `Summa: ${som(amount)}`,
      `Komissiya (${PAYOUT_COMMISSION_PERCENT}%): ${som(commission)}`,
      `Kartaga ötkaziladi: ${som(net)}`,
      `Karta: ${card}`,
      cardName ? `Karta egasi: ${cardName}` : "",
      `Qolgan balans: ${som(u?.balance ?? 0)}`,
      `Sörov ID: ${payout.id}`,
    ],
    { text: "Foydalanuvçi", href: adminUserUrl(userId) },
  );
  return payout;
}

/** Foydalanuvchi o'z so'rovini bekor qiladi — faqat bir marta (shartli), pul qaytadi. */
export async function cancelPayout(userId: string, id: string) {
  const done = await db.$transaction(async (tx) => {
    const p = await tx.payoutRequest.findUnique({ where: { id } });
    if (!p || p.userId !== userId) throw new PayoutError("Topilmadi");
    const upd = await tx.payoutRequest.updateMany({
      where: { id, status: "PENDING" },
      data: { status: "CANCELLED", resolvedAt: new Date() },
    });
    if (upd.count !== 1) throw new PayoutError("Bu sörovni bekor qilib bölmaydi");
    await tx.user.update({ where: { id: userId }, data: { balance: { increment: p.amount } } });
    await tx.walletTransaction.updateMany({
      where: { userId, type: "PAYOUT", status: "PENDING", meta: { path: ["payoutId"], equals: id } },
      data: { status: "FAILED", reversedAt: new Date() },
    });
    await tx.walletTransaction.create({
      data: { userId, type: "REFUND", amount: p.amount, method: "CARD", note: "Yeçib oliş sörovi bekor qilindi" },
    });
    return p;
  });
  await notifyAdmins("payouts", "↩️ Yeçiş sörovi (özi) bekor qilindi — tayyorr+", [
    `Summa: ${som(done.amount)}`,
    `Foydalanuvçi ID: ${userId}`,
  ]);
}
