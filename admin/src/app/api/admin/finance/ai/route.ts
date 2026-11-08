import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";
import { loadFinance } from "@/lib/finance";
import { aiEnabled, generateFinanceAi } from "@/lib/finance-ai";
import { resolvePeriod } from "@/lib/stats";

export const maxDuration = 60;

/** Moliya — tanlangan davr uchun AI tushuntirishi (Gemini). Body: { query: "r=30" | "from=…&to=…" } */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  if (!aiEnabled()) return NextResponse.json({ error: "GEMINI_API_KEY sozlanmagan" }, { status: 400 });
  const body = (await req.json().catch(() => null)) as { query?: unknown } | null;
  const sp = Object.fromEntries(new URLSearchParams(typeof body?.query === "string" ? body.query : "r=30"));
  try {
    const finance = await loadFinance(await resolvePeriod(sp));
    const ai = await generateFinanceAi(finance);
    return NextResponse.json({ ok: true, at: ai.at });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "AI javob bermadi" }, { status: 502 });
  }
}
