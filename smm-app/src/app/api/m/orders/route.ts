import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { orderView } from "@/lib/mobile-view";
import { ACTIVE, progressOf } from "@/lib/order-view";
import { syncOrders } from "@/lib/orders";
import { sessionUserId } from "@/lib/session";

/** Mobil ilova: buyurtmalarim — ro'yxat va statistikalar (saytdagi /orders bilan bir xil). */
export async function GET() {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  await syncOrders(userId);
  const rows = await db.smmOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { service: { select: { name: true, platform: true, category: true, refill: true } } },
  });
  let delivered = 0;
  let deliveredIn = 0;
  let spent = 0;
  for (const o of rows) {
    if (o.status === "COMPLETED" || o.status === "PARTIAL") {
      delivered += progressOf(o).delivered;
      deliveredIn++;
    }
    spent += o.charge - (o.refundAmount ?? 0);
  }
  return NextResponse.json({
    orders: rows.map(orderView),
    stats: {
      total: rows.length,
      active: rows.filter((o) => ACTIVE.includes(o.status)).length,
      delivered,
      deliveredIn,
      spent,
    },
  });
}
