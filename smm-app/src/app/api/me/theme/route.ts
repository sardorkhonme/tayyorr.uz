import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { sessionUserId } from "@/lib/session";
import { asTheme } from "@/lib/theme";

/** Mavzu tanlovi bazaga (user.theme) — tayyorr+, app.tayyorr.uz va mobil ilova ham şuni öqiydi. */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const theme = asTheme(body?.theme);
  if (!theme) return NextResponse.json({ error: "Notöğri" }, { status: 400 });
  await db.user.update({ where: { id: userId }, data: { theme } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
