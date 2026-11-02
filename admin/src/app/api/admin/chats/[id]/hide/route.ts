import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** Suhbatni foydalanuvchilardan yashiradi/qaytaradi (bazada saqlanib qoladi). */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const conv = await db.conversation.findUnique({
    where: { id },
    select: { hiddenFromUsersAt: true },
  });
  if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  const updated = await db.conversation.update({
    where: { id },
    data: { hiddenFromUsersAt: conv.hiddenFromUsersAt ? null : new Date() },
    select: { hiddenFromUsersAt: true },
  });

  return NextResponse.json({ ok: true, hidden: !!updated.hiddenFromUsersAt });
}
