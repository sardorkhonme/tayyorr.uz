import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";
import { telegramSelfTest } from "@/lib/telegram";

/** Admin: Telegram kanal ulanishini tekshiradi (kanalga sinov xabari yuboradi). */
export async function GET() {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const result = await telegramSelfTest();
  return NextResponse.json(result);
}
