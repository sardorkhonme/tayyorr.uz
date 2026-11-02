import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { maskCard } from "@/lib/wallet";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { PAYOUT_COMMISSION_PERCENT, payoutNet } from "@/lib/payout-commission";

export { OPTIONS } from "@/lib/mobile-cors";

const MIN = 1_000;

const schema = z.object({
  amount: z.coerce.number().int().positive(),
  card: z.string().min(12).max(25),
  cardName: z.string().trim().max(100).optional(),
});

/** Kartaga yechib olish — mablag' darhol hisobdan yechiladi. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
  }
  const { amount, cardName } = parsed.data;
  const card = parsed.data.card.replace(/\D/g, "");
  if (card.length < 16) {
    return mobileJson({ error: "Karta raqami 16 raqamdan iborat bo'lsin" }, { status: 400 });
  }
  if (amount < MIN) {
    return mobileJson({ error: `Eng kami ${MIN.toLocaleString("ru-RU")} so'm` }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: auth.userId },
    select: { balance: true, login: true, name: true, firstName: true, lastName: true, email: true },
  });
  if (!user || user.balance < amount) {
    return mobileJson({ error: "Hisobda yetarli mablag' yo'q" }, { status: 400 });
  }

  const payout = await db.$transaction(async (tx) => {
    await tx.user.update({ where: { id: auth.userId }, data: { balance: { decrement: amount } } });
    const p = await tx.payoutRequest.create({
      data: { userId: auth.userId, amount, card, cardName: cardName || null },
    });
    await tx.walletTransaction.create({
      data: {
        userId: auth.userId,
        type: "PAYOUT",
        status: "PENDING",
        amount,
        method: "CARD",
        note: `Kartaga yechib olindi — ${maskCard(card)} (mobil ilova)`,
        meta: { payoutId: p.id, card: maskCard(card) },
      },
    });
    return p;
  });

  await logActivity(
    auth.userId,
    "PAYOUT_REQUEST",
    `Kartaga yechish so'radi: ${amount.toLocaleString("ru-RU")} so'm — ${maskCard(card)} (mobil ilova)`,
    { amount, payoutId: payout.id },
  );
  await logToGroup(
    "payouts",
    "🏧 Yangi yechib olish so'rovi (mobil)",
    [
      `Foydalanuvchi: ${userLabel(user)}`,
      `Summa: ${amount.toLocaleString("ru-RU")} so'm`,
      `Komissiya (${PAYOUT_COMMISSION_PERCENT}%): ${payoutNet(amount).commission.toLocaleString("ru-RU")} so'm`,
      `Kartaga o'tkaziladi: ${payoutNet(amount).net.toLocaleString("ru-RU")} so'm`,
      `Karta: ${maskCard(card)}`,
      `So'rov ID: ${payout.id}`,
    ],
    siteUrl(`/sardorxon/admin/payouts`),
  );

  return mobileJson({ ok: true });
}
