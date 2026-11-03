import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { locale } = await req.json().catch(() => ({}));
  if (locale !== "uz" && locale !== "ru" && locale !== "en") {
    return NextResponse.json({ error: "Notöğri til" }, { status: 400 });
  }
  await db.user
    .update({ where: { id: session.user.id }, data: { locale } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
