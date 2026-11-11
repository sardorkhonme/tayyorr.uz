import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { sessionUserId } from "@/lib/session";

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Tayyorr SMM brauzer obunasi (site: "smm"). */
export async function POST(req: Request) {
  const userId = await sessionUserId();
  if (!userId) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri obuna" }, { status: 400 });
  const { endpoint, keys } = parsed.data;
  await db.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, p256dh: keys.p256dh, auth: keys.auth, site: "smm" },
    create: { userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, site: "smm" },
  });
  return NextResponse.json({ ok: true });
}
