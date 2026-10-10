import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getActiveAnnouncements } from "@/lib/announcement";

export { OPTIONS } from "@/lib/mobile-cors";

/** Bosh sahifadagi e'lon banneri — web dashboard bilan bir xil (rol bo'yicha). */
export async function GET(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const me = await db.user.findUnique({ where: { id: auth.userId }, select: { role: true } });
  const items = await getActiveAnnouncements(me?.role);
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
