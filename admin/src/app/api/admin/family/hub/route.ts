import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/**
 * tayyorr+ bosh sahifasidagi «Tayyorr's Family» kartasi (ilovada):
 * on — doim, off — hech kimga, days — ilovaga birinchi kirgandan keyin N kun.
 * O'qish: src/lib/family.ts → familyHubVisible.
 */
const KEY = "family.hub";
const schema = z.object({ mode: z.enum(["on", "off", "days"]), days: z.number().int().min(1).max(365).optional() });

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const row = await db.appSetting.findUnique({ where: { key: KEY } });
  let hub: { mode: string; days?: number } = { mode: "on" };
  try {
    if (row) hub = JSON.parse(row.value);
  } catch {
    /* standart */
  }
  return NextResponse.json({ hub });
}

export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri maʼlumot" }, { status: 400 });
  if (parsed.data.mode === "days" && !parsed.data.days) return NextResponse.json({ error: "Kunlar sonini kiriting" }, { status: 400 });
  const value = JSON.stringify(parsed.data);
  await db.appSetting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return NextResponse.json({ ok: true });
}
