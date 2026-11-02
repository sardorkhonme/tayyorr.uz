import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

/** Foydalanuvchining Telegram botga ulanishini uzadi. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const { id } = await params;
  await db.user.update({
    where: { id },
    data: {
      telegramChatId: null,
      telegramUsername: null,
      telegramLinkedAt: null,
      telegramBlockedAt: null,
    },
  });

  return NextResponse.json({ ok: true });
}
