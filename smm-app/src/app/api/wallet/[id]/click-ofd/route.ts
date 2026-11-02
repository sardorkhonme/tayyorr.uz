import { NextResponse } from "next/server";

import { sessionUserId } from "@/lib/session";
import { requestClickReceipt } from "@/lib/click-receipt";
import { db } from "@/lib/db";

/** Foydalanuvchi o'z Click to'lovining rasmiy chekini so'raydi. */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const { id } = await params;
  const wtx = await db.walletTransaction.findUnique({ where: { id }, select: { userId: true, method: true } });
  if (!wtx || wtx.userId !== userId || wtx.method !== "CLICK") {
    return NextResponse.json({ error: "Topilmadi" }, { status: 404 });
  }
  const r = await requestClickReceipt(id, userId);
  return r.ok ? NextResponse.json(r) : NextResponse.json({ error: r.error }, { status: 400 });
}
