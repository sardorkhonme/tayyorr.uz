import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { setMinOfferStars } from "@/lib/offer-settings";

const schema = z.object({ value: z.number().int().min(1).max(1000) });

/** Ariza uchun minimal starni o'zgartirish. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "1 dan 1000 gaça butun son kiriting" }, { status: 400 });
  await setMinOfferStars(parsed.data.value);
  return NextResponse.json({ ok: true });
}
