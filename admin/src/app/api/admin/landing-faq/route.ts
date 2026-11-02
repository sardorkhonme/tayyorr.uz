import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(2000),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

/** Yangi FAQ savolini qo'shadi. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Savol va javob kerak" }, { status: 400 });
  }
  const d = parsed.data;

  const f = await db.landingFaq.create({
    data: {
      question: d.question,
      answer: d.answer,
      order: d.order,
      active: d.active,
    },
  });

  return NextResponse.json({ ok: true, id: f.id });
}
