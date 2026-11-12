import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getActiveAnnouncements } from "@/lib/announcement";

export { OPTIONS } from "@/lib/mobile-cors";

/** E'lon banneri — web bilan bir xil: ?section=smm — Tayyorr SMM bo'limi, aks holda tayyorr.uz (rol bo'yicha). */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
  const section = new URL(req.url).searchParams.get("section") === "smm" ? "smm" : "uz";
  const items = await getActiveAnnouncements(me?.role, section);
  return mobileJson({
    announcements: items.map((a) => ({
      id: a.id,
      title: a.title.uz,
      body: a.body.uz,
      buttonText: a.buttonText.uz || null,
      buttonUrl: a.buttonUrl,
    })),
  });
}
