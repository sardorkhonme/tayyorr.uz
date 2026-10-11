import { db } from "@/lib/db";

/**
 * Ikki foydalanuvchi o'rtasidagi HOZIR faol shartnomalar — chat tepasida
 * qadalgan panelda ko'rsatiladi: yuborilgan (javob kutilmoqda) yoki
 * imzolangan (ish jarayonida / topshirilgan).
 */
export async function chatContractPins(me: string, otherId: string) {
  const rows = await db.contract.findMany({
    where: {
      OR: [
        { ordererId: me, preparerId: otherId },
        { ordererId: otherId, preparerId: me },
      ],
      AND: [
        {
          OR: [
            { status: "SENT", order: { status: "OPEN", deletedAt: null } },
            {
              status: "ACCEPTED",
              order: { status: { in: ["IN_PROGRESS", "DELIVERED"] }, deletedAt: null },
            },
          ],
        },
      ],
    },
    select: {
      status: true,
      deadline: true,
      cancelState: true,
      order: { select: { id: true, title: true, type: true, status: true, deadline: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((c) => ({
    id: c.order.id,
    title: c.order.title,
    type: c.order.type,
    status: c.order.status,
    contractStatus: c.status,
    cancelState: c.cancelState,
    deadline: (c.deadline ?? c.order.deadline)?.toISOString() ?? null,
  }));
}

export type ChatContractPin = Awaited<ReturnType<typeof chatContractPins>>[number];
