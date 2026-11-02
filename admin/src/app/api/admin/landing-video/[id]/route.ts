import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { PUBLIC_BUCKET, deleteObject } from "@/lib/r2";

const schema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  videoUrl: z.string().trim().min(1).max(600).optional(),
  videoKey: z.string().trim().max(400).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

/** Videoni tahrirlaydi (sarlavha, tartib, faollik yoki yangi fayl bilan almashtirish). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const found = await db.landingVideo.findUnique({ where: { id } });
  if (!found) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri ma'lumot" }, { status: 400 });
  }
  const d = parsed.data;

  // yangi fayl bilan almashtirilsa — eskisini R2dan o'chiramiz
  if (d.videoKey !== undefined && found.videoKey && d.videoKey !== found.videoKey) {
    await deleteObject(PUBLIC_BUCKET, found.videoKey).catch(() => {});
  }

  await db.landingVideo.update({
    where: { id },
    data: {
      ...(d.title !== undefined ? { title: d.title } : {}),
      ...(d.videoUrl !== undefined ? { videoUrl: d.videoUrl } : {}),
      ...(d.videoKey !== undefined ? { videoKey: d.videoKey || null } : {}),
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
  const found = await db.landingVideo.findUnique({ where: { id } });
  if (found?.videoKey) {
    await deleteObject(PUBLIC_BUCKET, found.videoKey).catch(() => {});
  }
  await db.landingVideo.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
