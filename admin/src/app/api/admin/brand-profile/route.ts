import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** «Tayyorr.uz» profili — guruhda admin «Tayyorr.uz» nomidan yozganda ko'rinadigan nom va rasm. */
const KEY = "family.brand";
const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const row = await db.appSetting.findUnique({ where: { key: KEY } });
  let profile: { name?: string; avatarUrl?: string } = {};
  try {
    profile = JSON.parse(row?.value ?? "{}");
  } catch {
    /* bo'sh */
  }
  return NextResponse.json({ profile });
}

export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri maʼlumot" }, { status: 400 });
  const value = JSON.stringify(parsed.data);
  await db.appSetting.upsert({ where: { key: KEY }, update: { value }, create: { key: KEY, value } });
  return NextResponse.json({ ok: true });
}
