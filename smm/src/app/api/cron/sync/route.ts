import { NextResponse } from "next/server";

import { syncOrders } from "@/lib/orders";

/** Barcha faol buyurtmalar holatini yangilaydi (Vercel Cron yoki tashqi cron). */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  const checked = await syncOrders();
  return NextResponse.json({ checked });
}
