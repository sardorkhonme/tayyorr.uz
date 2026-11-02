import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { buildClickPayUrl, CLICK_MAX, CLICK_MIN, clickConfigured } from "@/lib/click";
import { db } from "@/lib/db";

const schema = z.object({ amount: z.coerce.number().int() });

/** Click to'lovini boshlaydi: PENDING TOPUP yaratadi va to'lov havolasini qaytaradi. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  if (!clickConfigured()) {
    return NextResponse.json({ error: "To'lov vaqtincha ishlamayapti" }, { status: 503 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  const amount = parsed.success ? parsed.data.amount : 0;
  if (amount < CLICK_MIN || amount > CLICK_MAX) {
    return NextResponse.json(
      {
        error: `Summa ${CLICK_MIN.toLocaleString("ru-RU")} – ${CLICK_MAX.toLocaleString("ru-RU")} so'm oralig'ida bo'lsin`,
      },
      { status: 400 },
    );
  }

  const wtx = await db.walletTransaction.create({
    data: {
      userId: session.user.id,
      type: "TOPUP",
      status: "PENDING",
      amount,
      method: "CLICK",
      note: "Click orqali to'ldirish (TayyorrSMM)",
      meta: { source: "smm" },
    },
  });

  const payUrl = buildClickPayUrl({
    amount,
    transactionParam: wtx.id,
    returnUrl: `${new URL(req.url).origin}/?topup=1`,
  });
  return NextResponse.json({ payUrl });
}
