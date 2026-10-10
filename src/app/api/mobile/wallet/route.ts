import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { ensureWalletCode } from "@/lib/wallet";
import { expireStaleClickTopups, HIDE_UNFINISHED_TOPUPS } from "@/lib/wallet-pending";

export { OPTIONS } from "@/lib/mobile-cors";

/** Hamyon: balans, yulduzlar, hisob kodi va so'nggi tranzaksiyalar. */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  await expireStaleClickTopups(auth.userId);
  const [user, walletCode, txns, payouts] = await Promise.all([
    db.user.findUnique({
      where: { id: auth.userId },
      select: { balance: true, starBalance: true },
    }),
    ensureWalletCode(auth.userId),
    db.walletTransaction.findMany({
      // tugallanmagan Click to'lovi tarixda ko'rinmaydi (web bilan bir xil)
      where: { userId: auth.userId, ...HIDE_UNFINISHED_TOPUPS },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.payoutRequest.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  if (!user) return mobileJson({ error: "Topilmadi" }, { status: 404 });

  return mobileJson({
    balance: user.balance,
    starBalance: user.starBalance,
    walletCode,
    transactions: txns.map((t) => ({
      id: t.id,
      type: t.type,
      status: t.status,
      amount: t.amount,
      method: t.method,
      note: t.note,
      reversed: !!t.reversedAt,
      createdAt: t.createdAt.toISOString(),
    })),
    payouts: payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      status: p.status,
      adminNote: p.adminNote,
      createdAt: p.createdAt.toISOString(),
    })),
  });
}
