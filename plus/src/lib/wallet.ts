import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/** tayyorr.uz dagi hamyon bilan bir xil (src/lib/wallet.ts, wallet-pending.ts). */
export const TXN_LABEL: Record<string, string> = {
  TOPUP: "Töldiriş",
  SPEND: "Buyurtma tölovi",
  TRANSFER_IN: "Kirim ötkazma",
  TRANSFER_OUT: "Çiqim ötkazma",
  PAYOUT: "Kartaga yeçiş",
  REFUND: "Qaytariş",
  HOLD: "Şartnoma uçun bloklandi",
  RELEASE: "Iş haqi (yakunlangan)",
  COMMISSION: "Sayt komissiyasi",
};
export const OUTFLOW = new Set(["SPEND", "TRANSFER_OUT", "PAYOUT", "HOLD"]);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // chalkash belgilar yo'q

function randomCode() {
  let s = "";
  for (let i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `TYR-${s}`;
}

/** Foydalanuvchida walletCode bo'lmasa yaratadi va qaytaradi. */
export async function ensureWalletCode(userId: string): Promise<string> {
  const u = await db.user.findUnique({ where: { id: userId }, select: { walletCode: true } });
  if (u?.walletCode) return u.walletCode;
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const updated = await db.user.update({
        where: { id: userId },
        data: { walletCode: randomCode() },
        select: { walletCode: true },
      });
      return updated.walletCode!;
    } catch {
      // unique to'qnashuvi — qayta urinamiz
    }
  }
  throw new Error("Wallet kodi yaratilmadi");
}

/** Tugallanmagan Click to'lovi tarixda ko'rinmaydi; 30 daqiqada to'lanmasa — XATOLIK. */
export const HIDE_UNFINISHED_TOPUPS: Prisma.WalletTransactionWhereInput = {
  NOT: { type: "TOPUP", method: "CLICK", status: "PENDING" },
};

export async function expireStaleClickTopups(userId: string) {
  await db.walletTransaction.updateMany({
    where: {
      userId,
      type: "TOPUP",
      method: "CLICK",
      status: "PENDING",
      createdAt: { lt: new Date(Date.now() - 30 * 60 * 1000) },
    },
    data: { status: "FAILED" },
  });
}
