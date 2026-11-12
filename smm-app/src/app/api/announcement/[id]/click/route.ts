import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sessionUserId } from "@/lib/session";

/** E'lon tugmasini kim bosgani (admin ko'radi). */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ ok: true });
  const { id } = await params;
  await db.announcementClick
    .upsert({
      where: { announcementId_userId: { announcementId: id, userId } },
      create: { announcementId: id, userId },
      update: { updatedAt: new Date() },
    })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
