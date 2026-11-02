import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";
import { PUBLIC_BUCKET, deleteObject } from "@/lib/r2";

const HERO_VIDEO_ID = "hero";

const schema = z.object({
  videoUrl: z.string().trim().min(1).max(600),
  videoKey: z.string().trim().max(400).optional().default(""),
});

/** Hero fon videosini o'rnatadi yoki almashtiradi (singleton — bitta video). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Video kerak" }, { status: 400 });
  }
  const d = parsed.data;

  const prev = await db.heroVideo.findUnique({ where: { id: HERO_VIDEO_ID } });
  if (prev?.videoKey && prev.videoKey !== d.videoKey) {
    await deleteObject(PUBLIC_BUCKET, prev.videoKey).catch(() => {});
  }

  await db.heroVideo.upsert({
    where: { id: HERO_VIDEO_ID },
    update: { videoUrl: d.videoUrl, videoKey: d.videoKey || null, active: true },
    create: {
      id: HERO_VIDEO_ID,
      videoUrl: d.videoUrl,
      videoKey: d.videoKey || null,
      active: true,
    },
  });

  return NextResponse.json({ ok: true });
}

const toggleSchema = z.object({ active: z.boolean() });

/** Hero fon videosini faollashtiradi/o'chirmasdan nofaol qiladi. */
export async function PATCH(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = toggleSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const found = await db.heroVideo.findUnique({ where: { id: HERO_VIDEO_ID } });
  if (!found) return NextResponse.json({ error: "Video yo'q" }, { status: 404 });

  await db.heroVideo.update({
    where: { id: HERO_VIDEO_ID },
    data: { active: parsed.data.active },
  });
  return NextResponse.json({ ok: true });
}

/** Hero fon videosini o'chiradi. */
export async function DELETE() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const prev = await db.heroVideo.findUnique({ where: { id: HERO_VIDEO_ID } });
  if (prev?.videoKey) {
    await deleteObject(PUBLIC_BUCKET, prev.videoKey).catch(() => {});
  }
  await db.heroVideo.deleteMany({ where: { id: HERO_VIDEO_ID } });
  return NextResponse.json({ ok: true });
}
