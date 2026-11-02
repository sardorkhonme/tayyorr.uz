import { db } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { sendTelegramToUser, siteUrl } from "@/lib/telegram-notify";

type Reversible = {
  id: string;
  userId: string;
  amount: number;
  meta: unknown;
};

/**
 * SUCCESS holatidagi to'lovni ichki tizimda bekor qiladi: hisobdan
 * mablag'ni ayiradi, tranzaksiyani "reversedAt" bilan belgilaydi (hamyon
 * tarixida "BEKOR QILINGAN" nishoni bilan chiqadi), va foydalanuvchiga
 * xabar beradi. Click webhook orqali avtomatik bekor qilinganda ham,
 * admin panel orqali qo'lda (Click Merchant API bilan birga) bekor
 * qilinganda ham shu bitta funksiya ishlatiladi.
 */
export async function reverseWalletTopup(wtx: Reversible, reason: string) {
  const meta = (wtx.meta as Record<string, unknown>) ?? {};

  await db.$transaction(async (tx) => {
    await tx.walletTransaction.update({
      where: { id: wtx.id },
      data: {
        status: "FAILED",
        reversedAt: new Date(),
        meta: { ...meta, cancelledReason: reason, cancelledAt: new Date().toISOString() },
      },
    });
    await tx.user.update({
      where: { id: wtx.userId },
      data: { balance: { decrement: wtx.amount } },
    });
  });

  await logActivity(
    wtx.userId,
    "WALLET_TOPUP",
    `To'lov bekor qilindi (${reason}): ${wtx.amount.toLocaleString("ru-RU")} so'm hisobdan ayirildi`,
    { amount: wtx.amount, reason },
  );

  await sendTelegramToUser(wtx.userId, {
    title: "⚠️ To'lov bekor qilindi",
    body:
      `Click orqali to'langan ${wtx.amount.toLocaleString("ru-RU")} so'm bekor qilindi va hisobingizdan ayirildi. ` +
      `Pulingiz 24 ish soati ichida kartangizga qaytariladi.`,
    url: siteUrl("/wallet"),
    buttonLabel: "Hamyonni ko'rish",
  });
}
