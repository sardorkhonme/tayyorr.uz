import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Click orqali to'ldirish boshlanganda tranzaksiya PENDING bo'lib yaratiladi
 * (Click Prepare/Complete uni topishi uchun). Foydalanuvchi to'lov sahifasidan
 * to'lamay qaytsa, Click hech narsa yubormaydi — shuning uchun:
 *  - tugallanmagan to'lov foydalanuvchi tarixida ko'rinmaydi;
 *  - shu vaqt ichida to'lanmasa, "Xatolik" (FAILED) deb belgilanadi.
 */
export const CLICK_PENDING_TTL_MS = 30 * 60 * 1000;

/** Foydalanuvchiga ko'rsatiladigan tarixdan tugallanmagan Click to'lovlarini chiqaradi. */
export const HIDE_UNFINISHED_TOPUPS: Prisma.WalletTransactionWhereInput = {
  NOT: { type: "TOPUP", method: "CLICK", status: "PENDING" },
};

/** Muddati o'tgan tugallanmagan Click to'lovlarini FAILED qiladi. */
export async function expireStaleClickTopups(userId?: string) {
  await db.walletTransaction.updateMany({
    where: {
      type: "TOPUP",
      method: "CLICK",
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - CLICK_PENDING_TTL_MS) },
      ...(userId ? { userId } : {}),
    },
    data: { status: "FAILED" },
  });
}
