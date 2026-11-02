import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { checkClickPaymentStatus, clickMerchantApiConfigured } from "@/lib/click-merchant-api";

/** Click'dagi to'lov holatini jonli (real vaqtda) tekshiradi — Merchant API orqali. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  if (!clickMerchantApiConfigured()) {
    return NextResponse.json(
      { error: "Click Merchant API sozlanmagan (CLICK_MERCHANT_USER_ID yo'q)" },
      { status: 400 },
    );
  }

  const { id } = await params;
  const wtx = await db.walletTransaction.findUnique({ where: { id } });
  if (!wtx || wtx.method !== "CLICK") {
    return NextResponse.json({ error: "Click tranzaksiyasi emas" }, { status: 400 });
  }

  const result = await checkClickPaymentStatus(wtx.id, wtx.createdAt);
  return NextResponse.json(result.data, { status: result.ok ? 200 : result.status });
}
