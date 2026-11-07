import { NextResponse } from "next/server";

import { syncOrders } from "@/lib/orders";

/**
 * Admin paneldagi "Yangilash" tugmasi (admin.tayyorr.uz → shu yer): faol buyurtmalar holatini
 * provayderdan hozir so'rab bazaga yozadi — admin sahifasi bazadan o'qiydi. Provayder kaliti faqat shu saytda.
 * Ma'lumot qaytarmaydi; bitta buyurtma 10 soniyada, hammasi 30 soniyada ko'pi bilan bir marta so'raladi.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : undefined;
  const checked = await syncOrders(undefined, orderId ? { orderId, minAgeMs: 10_000 } : { minAgeMs: 30_000 });
  return NextResponse.json({ ok: true, checked });
}
