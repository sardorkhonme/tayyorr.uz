import { NextResponse } from "next/server";

import { checkProviderBalance } from "@/lib/balance-alert";
import { syncOrders } from "@/lib/orders";
import { maybeSyncServices } from "@/lib/sync-services";

export const maxDuration = 60;

/**
 * Barcha faol buyurtmalar holatini yangilaydi, provayder balansini tekshiradi va
 * xizmatlar ro'yxatini (6 soatda bir; `?services=1` — hozir) provayderdan tortadi.
 * Vercel Cron (kuniga 1 marta) + tashqi cron (masalan cron-job.org, har 10 daqiqa).
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ruxsat yöq" }, { status: 401 });
  }
  const force = new URL(req.url).searchParams.get("services") === "1";
  const checked = await syncOrders();
  const balance = await checkProviderBalance();
  const services = await maybeSyncServices(force);
  return NextResponse.json({ checked, balance, services });
}
