import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

export { OPTIONS } from "@/lib/mobile-cors";

/** Mobil ilova: kutilayotgan yechish so'rovini bekor qilish — web bilan bir xil. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authRes = await requireMobileAuth(req);
  if (authRes instanceof NextResponse) return authRes;
  const userId = authRes.userId;
  const { id } = await params;

  const p = await db.payoutRequest.findUnique({ where: { id } });
  if (!p || p.userId !== userId) {
    return mobileJson({ error: "Topilmadi" }, { status: 404 });
  }
  if (p.status !== "PENDING") {
    return mobileJson({ error: "Bu sörovni bekor qilib bölmaydi" }, { status: 400 });
  }

  await db.$transaction(async (tx) => {
    await tx.payoutRequest.update({
      where: { id },
      data: { status: "CANCELLED", resolvedAt: new Date() },
    });
    await tx.user.update({
      where: { id: p.userId },
      data: { balance: { increment: p.amount } },
    });
    await tx.walletTransaction.updateMany({
      where: {
        userId: p.userId,
        type: "PAYOUT",
        status: "PENDING",
        meta: { path: ["payoutId"], equals: id },
      },
      data: { status: "FAILED", reversedAt: new Date() },
    });
    await tx.walletTransaction.create({
      data: {
        userId: p.userId,
        type: "REFUND",
        amount: p.amount,
        method: "CARD",
        note: "Yeçib oliş sörovi bekor qilindi",
      },
    });
  });

  await logActivity(
    userId,
    "PAYOUT_CANCEL",
    `Yeçiş sörovini bekor qildi: ${p.amount.toLocaleString("ru-RU")} söm`,
    { amount: p.amount, payoutId: id },
  );
  await logToGroup(
    "payouts",
    "↩️ Yeçiş sörovi (özi) bekor qilindi",
    [
      `Summa: ${p.amount.toLocaleString("ru-RU")} söm`,
      `Foydalanuvçi ID: ${userId}`,
    ],
    siteUrl(`/sardorxon/admin/users/${userId}`),
  );

  return mobileJson({ ok: true });
}
