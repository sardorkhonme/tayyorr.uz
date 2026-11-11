import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";
import { sendWelcome, usersWithoutWelcome } from "@/lib/support-actions";

export const maxDuration = 60;
const BATCH = 40;

/** Nechta foydalanuvchi xush kelibsiz xabarini olmagan. */
export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  return NextResponse.json({ count: (await usersWithoutWelcome()).length });
}

/** Navbatdagi bo'lakka yuboradi (rolga qarab 2 ta xabar); mijoz `left` 0 bo'lguncha qayta chaqiradi. */
export async function POST() {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const missing = await usersWithoutWelcome();
  let sent = 0;
  for (const u of missing.slice(0, BATCH)) {
    try {
      await sendWelcome(u.id, u.firstName);
      sent++;
    } catch {
      /* birini o'tkazib yuboramiz */
    }
  }
  return NextResponse.json({ sent, left: Math.max(0, missing.length - sent) });
}
