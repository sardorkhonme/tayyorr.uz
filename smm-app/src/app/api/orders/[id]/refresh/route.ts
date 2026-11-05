import { NextResponse } from "next/server";

import { sessionUserId } from "@/lib/session";
import { db } from "@/lib/db";
import { syncOrders } from "@/lib/orders";

/** "Yangilash" tugmasi: bitta buyurtma holatini provayderdan darhol so'raydi (10 soniyada ko'pi bilan bir marta). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const { id } = await params;

  await syncOrders(userId, { orderId: id, minAgeMs: 10_000 });
  const o = await db.smmOrder.findFirst({
    where: { id, userId },
    select: { status: true, remains: true, startCount: true, checkedAt: true },
  });
  if (!o) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  return NextResponse.json({ order: o });
}
