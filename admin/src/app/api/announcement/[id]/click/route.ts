import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

/** Foydalanuvchi e'lon bannerdagi tugmani bosganini qayd qiladi. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { id } = await params;

  await db.announcementClick
    .upsert({
      where: { announcementId_userId: { announcementId: id, userId: session.user.id } },
      create: { announcementId: id, userId: session.user.id },
      update: { updatedAt: new Date() },
    })
    .catch(() => {});

  return NextResponse.json({ ok: true });
}
