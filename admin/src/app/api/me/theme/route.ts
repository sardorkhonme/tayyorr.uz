import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  const { theme } = await req.json().catch(() => ({}));
  if (theme !== "light" && theme !== "dark") {
    return NextResponse.json({ error: "Noto'g'ri" }, { status: 400 });
  }
  await db.user
    .update({ where: { id: session.user.id }, data: { theme } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
