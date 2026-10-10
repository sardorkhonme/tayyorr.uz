import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { buildClickPayUrl, CLICK_MIN, CLICK_MAX } from "@/lib/click";
import { siteUrl } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  amount: z.coerce.number().int(),
  // qaysi hisob to'ldiriladi: hamyon kodi yoki bo'sh (o'ziniki)
  walletCode: z.string().trim().max(20).optional(),
});

/** Mobil ilovadan Click orqali hisobni to'ldirish — web bilan bir xil oqim. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Ma'lumotlar noto'g'ri" }, { status: 400 });
  }
  const { amount, walletCode } = parsed.data;

  if (amount < CLICK_MIN || amount > CLICK_MAX) {
    return mobileJson(
      {
        error: `Summa ${CLICK_MIN.toLocaleString("ru-RU")} – ${CLICK_MAX.toLocaleString("ru-RU")} so'm oralig'ida bo'lsin`,
      },
      { status: 400 },
    );
  }

  const target =
    walletCode && walletCode.length > 0
      ? await db.user.findUnique({ where: { walletCode: walletCode.toUpperCase() } })
      : await db.user.findUnique({ where: { id: auth.userId } });
  if (!target) {
    return mobileJson({ error: "Bunday hisob kodi topilmadi" }, { status: 404 });
  }

  let note = "Click orqali to'ldirish (mobil ilova)";
  if (target.id !== auth.userId) {
    const me = await db.user.findUnique({ where: { id: auth.userId }, select: { login: true } });
    note = `Click orqali to'ldirish (${me?.login ?? auth.userId}, mobil ilova)`;
  }

  const wtx = await db.walletTransaction.create({
    data: {
      userId: target.id,
      type: "TOPUP",
      status: "PENDING",
      amount,
      method: "CLICK",
      note,
    },
  });

  const payUrl = buildClickPayUrl({
    amount,
    transactionParam: wtx.id,
    returnUrl: siteUrl("/wallet?click=1"),
  });

  return mobileJson({ ok: true, payUrl });
}
