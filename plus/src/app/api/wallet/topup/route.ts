import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { buildClickPayUrl, CLICK_MAX, CLICK_MIN, clickConfigured } from "@/lib/click";
import { db } from "@/lib/db";
import { payPlatform } from "@/lib/pay";
import { safeNext } from "@/lib/sso";

const schema = z.object({
  amount: z.coerce.number().int(),
  method: z.enum(["click", "payme", "uzum"]).default("click"),
  returnTo: z.string().optional(),
});

/**
 * Yagona to'lov sahifasi (/pay) uchun: PENDING TOPUP yaratadi va to'lov tizimi havolasini qaytaradi.
 * Hozircha faqat Click; Payme va Uzum ulanguncha rad etiladi.
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri maʼlumot" }, { status: 400 });
  const { amount, method } = parsed.data;
  // admin qo'ygan qisman cheklov — «Hamyon — hisobni to'ldirish» (src/lib/restriction-scope.ts bilan bir xil matn)
  const blocked = await db.userRestriction.findFirst({
    where: { userId: session.user.id, scope: "topup", until: { gt: new Date() } },
    select: { reason: true },
  });
  if (blocked) {
    return NextResponse.json(
      { error: `Sizga çeklov qöyilgan: «Hamyon — hisobni töldiriş»${blocked.reason ? `. Sabab: ${blocked.reason}` : ""}. Savollar bölsa — «tayyorr.uz support».`, restricted: true },
      { status: 403 },
    );
  }
  if (method !== "click") {
    return NextResponse.json({ error: "Bu tölov usuli tez orada ulanadi" }, { status: 400 });
  }
  if (!clickConfigured()) {
    return NextResponse.json({ error: "Tölov vaqtinça işlamayapti" }, { status: 503 });
  }
  if (amount < CLICK_MIN || amount > CLICK_MAX) {
    return NextResponse.json(
      {
        error: `Summa ${CLICK_MIN.toLocaleString("ru-RU")} – ${CLICK_MAX.toLocaleString("ru-RU")} söm oraliğida bölsin`,
      },
      { status: 400 },
    );
  }

  const origin = new URL(req.url).origin;
  const returnTo = safeNext(parsed.data.returnTo) ?? `${origin}/wallet`;
  const platform = payPlatform(returnTo);

  const wtx = await db.walletTransaction.create({
    data: {
      userId: session.user.id,
      type: "TOPUP",
      status: "PENDING",
      amount,
      method: "CLICK",
      note: `Click orqali töldiriş (${platform.label})`,
      // source: "smm" — tayyorr+ va SMM to'lovlari alohida Telegram topikka tushadi
      meta: { source: platform.key === "app" ? "uz" : "smm", platform: platform.key, returnTo },
    },
  });

  const back = new URL(returnTo);
  back.searchParams.set("topup", "1");
  const payUrl = buildClickPayUrl({ amount, transactionParam: wtx.id, returnUrl: back.toString() });
  return NextResponse.json({ payUrl });
}
