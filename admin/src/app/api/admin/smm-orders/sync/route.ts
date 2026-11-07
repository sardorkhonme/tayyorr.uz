import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";

const SMM_URL = (process.env.NEXT_PUBLIC_SMM_URL || "https://smm.tayyorr.uz").replace(/\/+$/, "");

/**
 * SMM buyurtma(lar) holatini provayderdan hozir yangilatadi. Provayder kaliti faqat smm.tayyorr.uz da —
 * o'sha sayt so'rab bazaga yozadi, admin sahifasi bazadan o'qiydi. orderId bo'lmasa — barcha faol buyurtmalar.
 */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const body = (await req.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === "string" ? body.orderId : undefined;
  try {
    const res = await fetch(`${SMM_URL}/api/orders-sync`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(orderId ? { orderId } : {}),
      cache: "no-store",
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error();
  } catch {
    return NextResponse.json({ error: "Tayyorr SMM javob bermadi" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
