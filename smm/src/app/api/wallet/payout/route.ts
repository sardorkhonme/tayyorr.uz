import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { PayoutError, requestPayout } from "@/lib/payout";

const schema = z.object({
  amount: z.coerce.number().int().positive(),
  card: z.string().min(12).max(25),
  cardName: z.string().trim().max(100).optional(),
});

/** Kartaga yechib olish so'rovi (cheklangan foydalanuvchi ham o'z pulini yecha oladi). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ma'lumot noto'g'ri" }, { status: 400 });
  try {
    const p = await requestPayout(session.user.id, parsed.data.amount, parsed.data.card, parsed.data.cardName);
    return NextResponse.json({ ok: true, payoutId: p.id });
  } catch (e) {
    if (e instanceof PayoutError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error("[plus] payout", e);
    return NextResponse.json({ error: "Kutilmagan xatolik" }, { status: 500 });
  }
}
