import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { GUIDE_ROLES, getGuideVideos, guideSteps, ROLE_TITLE, type GuideRole } from "@/lib/guide";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getMinOfferStars, getStarPrice } from "@/lib/stars";

export { OPTIONS } from "@/lib/mobile-cors";

/** "Qöllanma" — saytdagi /guide bilan bir xil matn va admin yuklagan videolar. ?role=ORDERER|PREPARER */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const asked = new URL(req.url).searchParams.get("role");
  let role: GuideRole;
  if (asked && (GUIDE_ROLES as string[]).includes(asked)) role = asked as GuideRole;
  else {
    const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
    role = me?.role === "PREPARER" ? "PREPARER" : "ORDERER";
  }

  const [starPrice, minOfferStars, videos] = await Promise.all([getStarPrice(), getMinOfferStars(), getGuideVideos(role)]);
  const steps = guideSteps(role, { starPrice, minOfferStars }).map((s) => ({
    icon: s.icon,
    title: s.title,
    points: s.points,
    link: s.link ?? null,
  }));
  return mobileJson({
    role,
    roles: GUIDE_ROLES.map((r) => ({ id: r, title: ROLE_TITLE[r] })),
    steps,
    videos: videos.map((v) => ({ id: v.id, title: v.title, url: v.url })),
  });
}
