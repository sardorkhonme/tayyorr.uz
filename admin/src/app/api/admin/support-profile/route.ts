import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  about: z.string().trim().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const id = await getSupportUserId();
  const u = await db.user.findUnique({
    where: { id },
    select: { name: true, about: true, avatarUrl: true },
  });
  return NextResponse.json({ profile: u });
}

export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const id = await getSupportUserId();
  await db.user.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ok: true });
}
