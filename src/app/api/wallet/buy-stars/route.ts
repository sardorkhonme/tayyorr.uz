import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { buyStars, STAR_PRICE } from "@/lib/stars";
import { logToGroup, siteUrl, userLabel } from "@/lib/telegram-log";

const schema = z.object({ stars: z.number().int().positive().max(10_000) });

/** Hamyondagi so'mdan star sotib olish. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  if (session.user.role !== "PREPARER") {
    return NextResponse.json(
      { error: "Star faqat tayyorlovçilarga kerak" },
      { status: 403 },
    );
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Star sonini töğri kiriting" }, { status: 400 });
  }

  const result = await buyStars({ userId: session.user.id, stars: parsed.data.stars });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { login: true, name: true, firstName: true, lastName: true, email: true },
  });

  await logToGroup(
    "stars",
    "⭐ Star sotib olindi",
    [
      `Foydalanuvçi: ${userLabel(user)}`,
      user?.email ? `Email: ${user.email}` : "",
      `Sotib olindi: ${parsed.data.stars} ⭐ (${(parsed.data.stars * STAR_PRICE).toLocaleString("ru-RU")} söm)`,
      `Yangi star balansi: ${result.newStars} ⭐`,
      `Yangi söm balansi: ${result.newSom.toLocaleString("ru-RU")} söm`,
      `Foydalanuvçi ID: ${session.user.id}`,
    ].filter(Boolean),
    siteUrl(`/sardorxon/admin/users/${session.user.id}`),
  );

  return NextResponse.json({ ok: true, newSom: result.newSom, newStars: result.newStars });
}
