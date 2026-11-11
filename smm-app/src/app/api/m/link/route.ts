import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { kindOf } from "@/lib/kinds";
import { normalizeLink } from "@/lib/links";

/** Mobil ilova: buyurtma formasida havolani jonli tekshirish ("Yuboriladi: …" yoki xato). Ochiq. */
export async function GET(req: Request) {
  const u = new URL(req.url);
  const serviceId = u.searchParams.get("serviceId") ?? "";
  const link = (u.searchParams.get("link") ?? "").slice(0, 500);
  const s = await db.smmService.findUnique({ where: { id: serviceId }, select: { platform: true, category: true, name: true } });
  if (!s) return NextResponse.json({ ok: false, error: "Xizmat topilmadi" }, { status: 404 });
  return NextResponse.json(normalizeLink(link, s.platform, kindOf(s.category, s.name), s.name));
}
