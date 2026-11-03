import { NextResponse } from "next/server";

import { db } from "@/lib/db";

/**
 * Landing (tayyorr.uz — alohida loyiha, bazaga ulanmagan) uchun ochiq ma'lumot:
 * "Amaliyotda" video panjarasi — admin panelda boshqariladi.
 * Faqat ommaviy (public bucket) havolalar qaytadi; CDN'da 5 daqiqa keshlanadi.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const videos = await db.landingVideo.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    take: 4,
    select: { id: true, title: true, videoUrl: true },
  });
  return NextResponse.json(
    { videos },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
