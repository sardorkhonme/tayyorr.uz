import { NextResponse } from "next/server";

import { sessionUserId } from "@/lib/session";
import { cancelPayout, PayoutError } from "@/lib/payout";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const { id } = await params;
  try {
    await cancelPayout(userId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof PayoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[plus] payout cancel", e);
    return NextResponse.json({ error: "Kutilmagan xatolik" }, { status: 500 });
  }
}
