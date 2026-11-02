import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** Suhbatni butunlay o'chiradi (xabarlar bilan). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  const conv = await db.conversation.findUnique({ where: { id } });
  if (!conv) return NextResponse.json({ error: "Topilmadi" }, { status: 404 });

  await db.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
