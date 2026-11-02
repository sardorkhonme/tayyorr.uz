import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";

// pulni qo'shgan turlar (bekor qilinganda balansdan ayiriladi)
const INFLOW = new Set(["TOPUP", "TRANSFER_IN", "REFUND"]);

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const txn = await db.walletTransaction.findUnique({ where: { id } });
  if (!txn) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (txn.reversedAt) {
    return NextResponse.json({ error: "Allaqachon bekor qilingan" }, { status: 400 });
  }
  if (txn.status !== "SUCCESS") {
    return NextResponse.json(
      { error: "Faqat muvaffaqiyatli amalni bekor qilish mumkin" },
      { status: 400 },
    );
  }

  const delta = INFLOW.has(txn.type) ? -txn.amount : txn.amount;

  await db.$transaction(async (tx) => {
    await tx.walletTransaction.update({
      where: { id },
      data: { reversedAt: new Date(), status: "FAILED" },
    });
    await tx.user.update({
      where: { id: txn.userId },
      data: { balance: { increment: delta } },
    });
    await tx.walletTransaction.create({
      data: {
        userId: txn.userId,
        type: "REFUND",
        status: "SUCCESS",
        amount: txn.amount,
        method: "ADMIN",
        note: `Admin bekor qildi (${txn.id})`,
        meta: { reverses: txn.id },
      },
    });
  });

  await sendTelegramToUser(txn.userId, {
    title: "⚠️ Tranzaksiya bekor qilindi",
    body: `${txn.amount.toLocaleString("ru-RU")} so'mlik amal admin tomonidan bekor qilindi, hisobingiz tuzatildi.`,
    url: siteUrl("/wallet"),
    buttonLabel: "Tranzaksiyalarni ko'rish",
  });

  return NextResponse.json({ ok: true });
}
