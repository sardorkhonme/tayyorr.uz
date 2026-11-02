import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { clickMerchantApiConfigured } from "@/lib/click-merchant-api";
import { fetchClickReceipt } from "@/lib/click-receipt";

/** Click'ning rasmiy fiskal chekini (OFD QR havolasi) topib beradi. */
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

  const result = await fetchClickReceipt(wtx);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
