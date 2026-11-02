import { db } from "@/lib/db";
import { refundOfferStars } from "@/lib/stars";
import { logToGroup, siteUrl } from "@/lib/telegram-log";

/**
 * Buyurtmani "soft delete" qiladi — buyurtmachida qoladi, boshqalarga ko'rinmaydi.
 * Faol/yuborilgan shartnomalar bekor qilinib bloklangan mablag' qaytariladi.
 * Qaytaradi: topilgan buyurtma (title, telegramMessageId kabi) yoki null.
 */
export async function softDeleteOrder(
  orderId: string,
  by: "ORDERER" | "ADMIN",
  reason: string | null,
) {
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      contracts: { where: { status: { in: ["SENT", "ACCEPTED"] } } },
    },
  });
  if (!order || order.deletedAt) return order ?? null;

  await db.$transaction(async (tx) => {
    for (const c of order.contracts) {
      await tx.contract.update({
        where: { id: c.id },
        data: {
          status: "CANCELLED",
          resolvedAt: new Date(),
          refundAmount: c.amount,
        },
      });
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
          note:
            by === "ADMIN"
              ? "Buyurtma admin tomonidan o'chirildi — bloklangan mablag' qaytdi"
              : "Buyurtma o'chirildi — bloklangan mablag' qaytdi",
        },
      });
    }
    if (order.preparerId) {
      await tx.user
        .update({
          where: { id: order.preparerId },
          data: { isAvailable: true },
        })
        .catch(() => {});
    }
    await tx.order.update({
      where: { id: orderId },
      data: {
        deletedAt: new Date(),
        deletedByRole: by,
        deleteReason: reason,
      },
    });
  });

  // buyurtma hech kim tomonidan bajarilmay o'chirildi — ariza yuborganlarga
  // sarflagan starlari qaytariladi (bu ularning aybi emas)
  if (order.status !== "DONE") {
    await refundOfferStars(orderId, "o'chirildi");
  }

  await logToGroup(
    "orders",
    "🗑 Buyurtma o'chirildi",
    [
      `«${order.title}»`,
      `Kim: ${by === "ADMIN" ? "Admin" : "Buyurtmachi"}`,
      reason ? `Sabab: ${reason}` : "",
      `Buyurtma ID: ${orderId}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/orders/${orderId}`),
  );

  return order;
}
