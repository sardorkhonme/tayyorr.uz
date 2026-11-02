import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({
  status: z.enum(["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"]).optional(),
  adminNote: z.string().trim().max(2000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }
  const { status, adminNote } = parsed.data;

  const existing = await db.complaint.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await db.complaint.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(adminNote !== undefined ? { adminNote } : {}),
      ...(status === "RESOLVED" || status === "DISMISSED"
        ? { resolvedAt: new Date() }
        : {}),
    },
  });

  return NextResponse.json({ ok: true });
}
