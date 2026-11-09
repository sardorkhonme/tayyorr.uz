import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { setStarPrice } from "@/lib/guide-settings";

const schema = z.object({ value: z.number().int().min(100).max(1_000_000) });

/** 1 star narxini (so'm) o'zgartirish — yangi xaridlarga darhol ta'sir qiladi. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "100 dan 1 000 000 gaça butun son kiriting" }, { status: 400 });
  }
  await setStarPrice(parsed.data.value);
  return NextResponse.json({ ok: true });
}
