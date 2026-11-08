import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { saveFinanceSettings } from "@/lib/finance";

const schema = z.object({ clickPct: z.number().min(0).max(50), paymePct: z.number().min(0).max(50) });

/** Moliya sozlamasi: to'lov tizimlari olib qoladigan foiz. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Foiz 0 dan 50 gaça bölsin" }, { status: 400 });
  await saveFinanceSettings(parsed.data);
  return NextResponse.json({ ok: true });
}
