import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { setVersionLabel } from "@/lib/app-version";

const schema = z.object({ label: z.string().trim().max(30) });

/** Akkaunt bo'limi ostidagi versiya yorlig'ini o'zgartiradi (bo'sh — avtomatik). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "30 belgidan oshmasin" }, { status: 400 });
  await setVersionLabel(parsed.data.label);
  return NextResponse.json({ ok: true });
}
