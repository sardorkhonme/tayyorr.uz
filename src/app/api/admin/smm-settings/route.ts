import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { logToGroup } from "@/lib/telegram-log";
import { getSmmSettings, setSmmMarkupPercent } from "@/lib/smm-settings";

const schema = z.object({ markupPercent: z.coerce.number().min(0).max(500) });

/** tayyorr+ ustamasini (%) o'zgartiradi — narxlar darhol yangilanadi. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ustama 0 – 500% oraliğida bölsin" }, { status: 400 });
  }
  const pct = Math.round(parsed.data.markupPercent * 10) / 10;
  const before = await getSmmSettings();
  await setSmmMarkupPercent(pct);
  await logToGroup("smmSystem", "⚙️ tayyorr+ ustamasi özgartirildi", [
    `${before.markupPercent}% → ${pct}%`,
  ]);
  return NextResponse.json({ ok: true, markupPercent: pct });
}
