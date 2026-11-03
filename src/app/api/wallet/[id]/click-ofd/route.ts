import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { clickMerchantApiConfigured } from "@/lib/click-merchant-api";
import { fetchClickReceipt } from "@/lib/click-receipt";

/** Foydalanuvchi o'z to'lovi uchun Click'ning rasmiy fiskal chekini so'raydi. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  if (!clickMerchantApiConfigured()) {
    return NextResponse.json({ error: "Çek hozirça mavjud emas" }, { status: 400 });
  }

  const { id } = await params;
  const wtx = await db.walletTransaction.findUnique({ where: { id } });
  if (!wtx || wtx.userId !== session.user.id || wtx.method !== "CLICK") {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }

  const result = await fetchClickReceipt(wtx);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json(result);
}
