import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { restrictionApiError } from "@/lib/restriction";

const schema = z.object({ isAvailable: z.boolean().optional() });

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }
  if (session.user.role !== "PREPARER") {
    return NextResponse.json({ error: "Faqat tayyorlovçilar uçun" }, { status: 403 });
  }
  const restricted = await restrictionApiError(session.user.id);
  if (restricted) return restricted;

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  const explicit = parsed.success ? parsed.data.isAvailable : undefined;

  const me = await db.user.findUnique({
    where: { id: session.user.id },
    select: { isAvailable: true },
  });

  const next = explicit ?? !me?.isAvailable;

  const updated = await db.user.update({
    where: { id: session.user.id },
    data: { isAvailable: next },
    select: { isAvailable: true },
  });

  return NextResponse.json({ isAvailable: updated.isAvailable });
}
