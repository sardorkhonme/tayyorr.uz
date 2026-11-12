import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { asTheme } from "@/lib/theme";

/** Mavzu tanlovi bazaga (user.theme) — app.tayyorr.uz, Tayyorr SMM va mobil ilova ham şuni öqiydi. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const body = await req.json().catch(() => null);
  const theme = asTheme(body?.theme);
  if (!theme) return NextResponse.json({ error: "Notöğri" }, { status: 400 });
  await db.user.update({ where: { id: session.user.id }, data: { theme } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
