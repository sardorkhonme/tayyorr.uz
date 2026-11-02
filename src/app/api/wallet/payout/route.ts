import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { maskCard } from "@/lib/wallet";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";
import { PAYOUT_COMMISSION_PERCENT, payoutNet } from "@/lib/payout-commission";

const MIN = 1_000;

const schema = z.object({
  amount: z.coerce.number().int().positive(),
  card: z.string().min(12).max(25),
  cardName: z.string().trim().max(100).optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  // cheklangan foydalanuvchi ham pulini yechib olishi mumkin — bu yerda tekshirmaymiz
  const me = session.user.id;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
  }
  const { amount, cardName } = parsed.data;
  const card = parsed.data.card.replace(/\D/g, "");
  if (card.length < 16) {
    return NextResponse.json({ error: "Karta raqami 16 raqamdan iborat bo'lsin" }, { status: 400 });
  }
  if (amount < MIN) {
    return NextResponse.json(
      { error: `Eng kami ${MIN.toLocaleString("ru-RU")} so'm` },
      { status: 400 },
    );
  }

  const user = await db.user.findUnique({
    where: { id: me },
    select: {
      balance: true,
      login: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      walletCode: true,
    },
  });
  if (!user || user.balance < amount) {
    return NextResponse.json({ error: "Hisobda yetarli mablag' yo'q" }, { status: 400 });
  }

  let newBalance = user.balance;
  const payout = await db.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id: me },
      data: { balance: { decrement: amount } },
      select: { balance: true },
    });
    newBalance = u.balance;
    const p = await tx.payoutRequest.create({
      data: { userId: me, amount, card, cardName: cardName || null },
    });
    await tx.walletTransaction.create({
      data: {
        userId: me,
        type: "PAYOUT",
        status: "PENDING",
        amount,
        method: "CARD",
        note: `Kartaga yechib olindi — ${maskCard(card)}`,
        meta: { payoutId: p.id, card: maskCard(card) },
      },
    });
    return p;
  });

  await logActivity(
    me,
    "PAYOUT_REQUEST",
    `Kartaga yechish so'radi: ${amount.toLocaleString("ru-RU")} so'm — ${maskCard(card)}`,
    { amount, payoutId: payout.id },
  );
  await logToGroup(
    "payouts",
    "🏧 Yangi yechib olish so'rovi",
    [
      `Foydalanuvchi: ${userLabel(user)}`,
      user.email ? `Email: ${user.email}` : "",
      user.walletCode ? `Hisob kodi: ${user.walletCode}` : "",
      `Summa: ${amount.toLocaleString("ru-RU")} so'm`,
      `Komissiya (${PAYOUT_COMMISSION_PERCENT}%): ${payoutNet(amount).commission.toLocaleString("ru-RU")} so'm`,
      `Kartaga o'tkaziladi: ${payoutNet(amount).net.toLocaleString("ru-RU")} so'm`,
      `Karta: ${card}`,
      cardName ? `Karta egasi: ${cardName}` : "",
      `Qolgan balans: ${newBalance.toLocaleString("ru-RU")} so'm`,
      `So'rov ID: ${payout.id}`,
      `Foydalanuvchi ID: ${me}`,
    ].filter(Boolean),
    siteUrl("/sardorxon/admin/payouts"),
  );

  return NextResponse.json({ ok: true, payoutId: payout.id });
}
