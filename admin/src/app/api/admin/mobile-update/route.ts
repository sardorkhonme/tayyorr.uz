import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { getMobileUpdate, setMobileUpdate, versionCode } from "@/lib/mobile-update";

const ver = z
  .string()
  .trim()
  .refine((v) => v === "" || versionCode(v) > 0, "Versiya «1.1» körinişida bölsin (ikki raqam, nuqta bilan)");

const schema = z.object({
  latest: ver,
  min: ver,
  notes: z.string().trim().max(1000).default(""),
  // yangi APK yuklangan bo'lsa — uning R2 kaliti
  apkKey: z.string().trim().regex(/^app\/[\w.\-/]+\.apk$/).optional(),
});

/** Ilova yangilanishi: eng yangi versiya, APK, majburiy (minimal) versiya va "nima yangi". */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Notöğri maʼlumot" }, { status: 400 });
  }
  const d = parsed.data;
  const cur = await getMobileUpdate();
  const latest = d.latest || cur.latest;
  if (d.min && versionCode(d.min) > versionCode(latest)) {
    return NextResponse.json(
      { error: "Majburiy versiya yuklangan APK versiyasidan katta bölişi mumkin emas — avval yangi APK yuklang" },
      { status: 400 },
    );
  }
  await setMobileUpdate({ latest, min: d.min, notes: d.notes, apkKey: d.apkKey || cur.apkKey });
  return NextResponse.json({ ok: true });
}
