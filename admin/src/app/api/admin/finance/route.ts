import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { saveFinanceSettings } from "@/lib/finance";

const pct = z.number().min(0).max(50);
const schema = z.object({
  clickPct: pct,
  paymePct: pct,
  deposit: z.object({ crypto: pct, card: pct, other: pct }),
});

/** Moliya sozlamasi: to'lov tizimlari va provayderga pul tashlash usullari olib qoladigan foiz. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Foiz 0 dan 50 gaça bölsin" }, { status: 400 });
  await saveFinanceSettings(parsed.data);
  return NextResponse.json({ ok: true });
}
