import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  titleRu: z.string().trim().max(200).optional(),
  titleEn: z.string().trim().max(200).optional(),
  body: z.string().trim().max(2000).optional(),
  bodyRu: z.string().trim().max(2000).optional(),
  bodyEn: z.string().trim().max(2000).optional(),
  buttonText: z.string().trim().max(60).optional(),
  buttonTextRu: z.string().trim().max(60).optional(),
  buttonTextEn: z.string().trim().max(60).optional(),
  buttonUrl: z.string().trim().max(500).optional(),
  role: z.enum(["ORDERER", "PREPARER"]).nullable().optional(),
  active: z.boolean().optional(),
});

/** E'lonni tahrirlaydi yoki faol/nofaol qiladi. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const found = await db.announcement.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const d = parsed.data;

  const opt = (val: string | undefined) =>
    val !== undefined ? { set: val || null } : undefined;

  await db.announcement.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      titleRu: opt(d.titleRu),
      titleEn: opt(d.titleEn),
      ...(d.body !== undefined ? { body: d.body } : {}),
      bodyRu: opt(d.bodyRu),
      bodyEn: opt(d.bodyEn),
      buttonText: opt(d.buttonText),
      buttonTextRu: opt(d.buttonTextRu),
      buttonTextEn: opt(d.buttonTextEn),
      ...(d.buttonUrl !== undefined ? { buttonUrl: d.buttonUrl || null } : {}),
      ...(d.role !== undefined ? { role: d.role } : {}),
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
  await db.announcement.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
