import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { clickMerchantApiConfigured } from "@/lib/click-merchant-api";
import { fetchClickReceipt } from "@/lib/click-receipt";
import { verifyInternal } from "@/lib/sso";

const schema = z.object({ id: z.string().min(1), userId: z.string().min(1), ts: z.number(), sig: z.string() });

/**
 * Ichki (server-server): tayyorr+ va Tayyorr SMM foydalanuvchiga Click rasmiy chekini
 * shu yerdan oladi — Click maxfiy kaliti boshqa loyihalarga tarqatilmaydi.
 * So'rov SSO_SECRET bilan imzolangan va 2 daqiqa amal qiladi.
 */
export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  const { id, userId, ts, sig } = parsed.data;
  if (Math.abs(Date.now() - ts) > 120_000 || !(await verifyInternal(`click-ofd.${id}.${userId}.${ts}`, sig))) {
    return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 401 });
  }
  if (!clickMerchantApiConfigured()) {
    return NextResponse.json({ error: "Chek hozircha mavjud emas" }, { status: 400 });
  }

  const wtx = await db.walletTransaction.findUnique({ where: { id } });
  if (!wtx || wtx.userId !== userId || wtx.method !== "CLICK") {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
  const result = await fetchClickReceipt(wtx);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
