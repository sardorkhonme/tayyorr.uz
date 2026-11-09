import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { getGuideVideos, saveGuideVideos } from "@/lib/guide-settings";

const role = z.enum(["ORDERER", "PREPARER"]);
const title = z.string().trim().min(1, "Sarlavha yozing").max(200);

/** Yangi qo'llanma videosi — ro'yxat oxiriga (fayl avval R2ga presign orqali yuklanadi). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = z
    .object({ role, title, videoUrl: z.string().trim().url().max(600), videoKey: z.string().trim().max(400).optional() })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Notöğri sörov" }, { status: 400 });
  const d = parsed.data;
  const list = await getGuideVideos(d.role);
  list.push({ id: randomUUID(), title: d.title, url: d.videoUrl, key: d.videoKey || null, at: new Date().toISOString() });
  await saveGuideVideos(d.role, list);
  return NextResponse.json({ ok: true });
}

/** Sarlavhani o'zgartirish, faylni almashtirish yoki tartibni surish (yuqoriga/pastga). */
export async function PATCH(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = z
    .object({
      role,
      id: z.string().min(1),
      title: title.optional(),
      videoUrl: z.string().trim().url().max(600).optional(),
      videoKey: z.string().trim().max(400).optional(),
      move: z.enum(["up", "down"]).optional(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Notöğri sörov" }, { status: 400 });
  const d = parsed.data;
  const list = await getGuideVideos(d.role);
  const i = list.findIndex((v) => v.id === d.id);
  if (i < 0) return NextResponse.json({ error: "Video topilmadi" }, { status: 404 });
  if (d.title) list[i].title = d.title;
  if (d.videoUrl) {
    list[i].url = d.videoUrl;
    list[i].key = d.videoKey || null;
    list[i].at = new Date().toISOString();
  }
  if (d.move) {
    const j = d.move === "up" ? i - 1 : i + 1;
    if (j >= 0 && j < list.length) [list[i], list[j]] = [list[j], list[i]];
  }
  await saveGuideVideos(d.role, list);
  return NextResponse.json({ ok: true });
}

/** Videoni ro'yxatdan olib tashlaydi. */
export async function DELETE(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const sp = new URL(req.url).searchParams;
  const r = role.safeParse(sp.get("role"));
  const id = sp.get("id");
  if (!r.success || !id) return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  const list = await getGuideVideos(r.data);
  await saveGuideVideos(r.data, list.filter((v) => v.id !== id));
  return NextResponse.json({ ok: true });
}
