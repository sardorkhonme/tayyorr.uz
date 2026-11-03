import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;

  const p = await db.payoutRequest.findUnique({ where: { id } });
  if (!p || p.userId !== session.user.id) {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
  if (p.status !== "PENDING") {
    return NextResponse.json({ error: "Bu sörovni bekor qilib bölmaydi" }, { status: 400 });
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
    session.user.id,
    "PAYOUT_CANCEL",
    `Yeçiş sörovini bekor qildi: ${p.amount.toLocaleString("ru-RU")} söm`,
    { amount: p.amount, payoutId: id },
  );
  await logToGroup(
    "payouts",
    "↩️ Yeçiş sörovi (özi) bekor qilindi",
    [
      `Summa: ${p.amount.toLocaleString("ru-RU")} söm`,
      `Foydalanuvçi ID: ${session.user.id}`,
    ],
    siteUrl(`/sardorxon/admin/users/${session.user.id}`),
  );

  return NextResponse.json({ ok: true });
}
