import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({
  question: z.string().trim().min(1).max(300).optional(),
  answer: z.string().trim().min(1).max(2000).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

/** FAQ savolini tahrirlaydi. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const found = await db.landingFaq.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const d = parsed.data;

  await db.landingFaq.update({
    where: { id },
    data: {
      ...(d.question !== undefined ? { question: d.question } : {}),
      ...(d.answer !== undefined ? { answer: d.answer } : {}),
      ...(d.order !== undefined ? { order: d.order } : {}),
      ...(d.active !== undefined ? { active: d.active } : {}),
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  await db.landingFaq.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
