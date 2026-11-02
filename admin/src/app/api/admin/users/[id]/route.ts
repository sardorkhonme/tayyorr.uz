import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** Foydalanuvchini butunlay o'chiradi (barcha bog'liq ma'lumotlar bilan). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true, isPlatform: true },
  });
  if (!user) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  if (user.isSupport || user.isPlatform) {
    return NextResponse.json(
      { error: "Tizim hisobini o'chirib bo'lmaydi" },
      { status: 400 },
    );
  }

  // bu foydalanuvchi TAYYORLOVCHI bo'lgan faol shartnomalardagi mablag'ni
  // buyurtmachiga qaytaramiz
  const contracts = await db.contract.findMany({
    where: { preparerId: id, status: { in: ["SENT", "ACCEPTED"] } },
  });

  await db.$transaction(async (tx) => {
    for (const c of contracts) {
      await tx.user.update({
        where: { id: c.ordererId },
        data: { balance: { increment: c.amount } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: c.ordererId,
          type: "REFUND",
          amount: c.amount,
          method: "ESCROW",
          note: "Tayyorlovchi hisobi o'chirildi — bloklangan mablag' qaytdi",
        },
      });
    }
    await tx.user.delete({ where: { id } });
  });

  return NextResponse.json({ ok: true });
}
