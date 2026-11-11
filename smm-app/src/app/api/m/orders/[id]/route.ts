import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { orderView } from "@/lib/mobile-view";
import { syncOrders } from "@/lib/orders";
import { sessionUserId } from "@/lib/session";

/** Mobil ilova: buyurtma tafsiloti — holat, bajarilish, hamyon amallari. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const { id } = await params;
  await syncOrders(userId, { orderId: id });
  const o = await db.smmOrder.findFirst({
    where: { id, userId },
    include: { service: { select: { name: true, platform: true, category: true, refill: true } } },
  });
  if (!o) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  const txns = await db.walletTransaction.findMany({
    where: { userId, meta: { path: ["smmOrderId"], equals: o.id } },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, amount: true, createdAt: true },
  });
  return NextResponse.json({
    order: orderView(o),
    txns: txns.map((t) => ({ id: t.id, type: t.type, amount: t.amount, createdAt: t.createdAt.toISOString() })),
  });
}
