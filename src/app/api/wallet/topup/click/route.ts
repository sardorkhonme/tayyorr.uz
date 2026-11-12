import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buildClickPayUrl, CLICK_MIN, CLICK_MAX } from "@/lib/click";
import { scopedApiError } from "@/lib/restriction-scope";

import { APP_URL as SITE_URL } from "@/lib/site";

const schema = z.object({
  amount: z.coerce.number().int(),
  // qaysi hisob to'ldiriladi: hamyon kodi yoki bo'sh (o'ziniki)
  walletCode: z.string().trim().max(20).optional(),
});

/** Click orqali haqiqiy to'lovni boshlaydi: PENDING WalletTransaction yaratadi va Click to'lov havolasini qaytaradi. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Maʼlumotlar notöğri" },
      { status: 400 },
    );
  }
  const { amount, walletCode } = parsed.data;
  const scoped = await scopedApiError(session.user.id, "topup");
  if (scoped) return scoped;

  if (amount < CLICK_MIN || amount > CLICK_MAX) {
    return NextResponse.json(
      {
        error: `Summa ${CLICK_MIN.toLocaleString("ru-RU")} – ${CLICK_MAX.toLocaleString("ru-RU")} söm oraliğida bölsin`,
      },
      { status: 400 },
    );
  }

  const target =
    walletCode && walletCode.length > 0
      ? await db.user.findUnique({ where: { walletCode: walletCode.toUpperCase() } })
      : await db.user.findUnique({ where: { id: session.user.id } });

  if (!target) {
    return NextResponse.json({ error: "Bunday hisob kodi topilmadi" }, { status: 404 });
  }

  const wtx = await db.walletTransaction.create({
    data: {
      userId: target.id,
      type: "TOPUP",
      status: "PENDING",
      amount,
      method: "CLICK",
      note:
        target.id === session.user.id
          ? "Click orqali töldiriş"
          : `Click orqali töldiriş (${session.user.login ?? session.user.id})`,
    },
  });

  const payUrl = buildClickPayUrl({
    amount,
    transactionParam: wtx.id,
    returnUrl: `${SITE_URL}/wallet?click=1`,
  });

  return NextResponse.json({ ok: true, payUrl });
}
