import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({
  token: z.string().min(20).max(4096),
  platform: z.string().max(20).optional(),
});

/** Ilova FCM tokenini ro'yxatdan o'tkazadi (kirganda va token yangilanganda). */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Token kerak" }, { status: 400 });
  const { token, platform } = parsed.data;
  // bir qurilmada hisob almashsa — token yangi egasiga o'tadi
  await db.deviceToken.upsert({
    where: { token },
    update: { userId: auth.userId, platform: platform ?? "android" },
    create: { token, userId: auth.userId, platform: platform ?? "android" },
  });
  return mobileJson({ ok: true });
}

/** Tizimdan chiqqanda — shu qurilmaga push kelmasin. */
export async function DELETE(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Token kerak" }, { status: 400 });
  await db.deviceToken.deleteMany({ where: { token: parsed.data.token, userId: auth.userId } });
  return mobileJson({ ok: true });
}
