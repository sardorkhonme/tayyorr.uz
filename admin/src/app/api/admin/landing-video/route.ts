import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  videoUrl: z.string().trim().min(1).max(600),
  videoKey: z.string().trim().max(400).optional().default(""),
  order: z.number().int().default(0),
  active: z.boolean().default(true),
});

/** Yangi landing video qo'shadi (fayl avval R2ga presign orqali yuklanadi). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sarlavha va video kerak" }, { status: 400 });
  }
  const d = parsed.data;

  const v = await db.landingVideo.create({
    data: {
      title: d.title,
      videoUrl: d.videoUrl,
      videoKey: d.videoKey || null,
      order: d.order,
      active: d.active,
    },
  });

  return NextResponse.json({ ok: true, id: v.id });
}
