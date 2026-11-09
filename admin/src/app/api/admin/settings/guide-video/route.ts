import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { setGuideVideo } from "@/lib/guide-settings";

const role = z.enum(["ORDERER", "PREPARER"]);
const schema = z.object({
  role,
  videoUrl: z.string().trim().url().max(600),
  videoKey: z.string().trim().max(400).optional(),
});

/** Qo'llanma videosini o'rnatadi (fayl avval R2ga presign orqali yuklanadi). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Video yuklanmadi" }, { status: 400 });
  await setGuideVideo(parsed.data.role, { url: parsed.data.videoUrl, key: parsed.data.videoKey || null });
  return NextResponse.json({ ok: true });
}

/** Qo'llanma videosini olib tashlaydi. */
export async function DELETE(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = role.safeParse(new URL(req.url).searchParams.get("role"));
  if (!parsed.success) return NextResponse.json({ error: "Rol notöğri" }, { status: 400 });
  await setGuideVideo(parsed.data, null);
  return NextResponse.json({ ok: true });
}
