import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

/** Ilovadagi e'lon tugmasi bosilgani — webdagi /api/announcement/[id]/click bilan bir xil. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  await db.announcementClick
    .upsert({
      where: { announcementId_userId: { announcementId: id, userId: auth.userId } },
      create: { announcementId: id, userId: auth.userId },
      update: { updatedAt: new Date() },
    })
    .catch(() => {});
  return mobileJson({ ok: true });
}
