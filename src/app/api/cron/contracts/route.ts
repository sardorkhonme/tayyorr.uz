import { NextResponse } from "next/server";

import { sweepContracts } from "@/lib/contract-flow";

/**
 * Muddati o'tgan shartnomalarni hal qiladi (Vercel Cron). Amallar faqat
 * muddati haqiqatan o'tgan holatlarda bajariladi, shuning uchun qayta
 * chaqirish xavfsiz. CRON_SECRET o'rnatilgan bo'lsa — tekshiriladi.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  await sweepContracts({ force: true });
  return NextResponse.json({ ok: true });
}
