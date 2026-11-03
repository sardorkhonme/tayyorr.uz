import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Landing (tayyorr.uz — alohida loyiha, bazaga ulanmagan) uchun ochiq ma'lumot:
 * hero fon videosi va "Amaliyotda" video panjarasi — ikkalasi admin panelda boshqariladi.
 * Faqat ommaviy (public bucket) havolalar qaytadi; CDN'da 5 daqiqa keshlanadi.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const [hero, videos] = await Promise.all([
    db.heroVideo.findUnique({ where: { id: "hero" }, select: { videoUrl: true, active: true } }),
    db.landingVideo.findMany({
      where: { active: true },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
      take: 4,
      select: { id: true, title: true, videoUrl: true },
    }),
  ]);
  return NextResponse.json(
    { heroVideo: hero?.active ? hero.videoUrl : null, videos },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
