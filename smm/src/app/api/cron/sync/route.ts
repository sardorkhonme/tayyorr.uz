import { NextResponse } from "next/server";

import { checkProviderBalance } from "@/lib/balance-alert";
import { syncOrders } from "@/lib/orders";

/**
 * Barcha faol buyurtmalar holatini yangilaydi va provayder balansini tekshiradi.
 * Vercel Cron (kuniga 1 marta) + tashqi cron (masalan cron-job.org, har 10 daqiqa).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const checked = await syncOrders();
  const balance = await checkProviderBalance();
  return NextResponse.json({ checked, balance });
}
