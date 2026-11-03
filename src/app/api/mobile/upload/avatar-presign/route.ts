import { NextResponse } from "next/server";
import { z } from "zod";

import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { PUBLIC_BUCKET, buildKey, presignPut, publicUrl } from "@/lib/r2";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(150),
});

/** Profil rasmini yuklash uchun R2'ga to'g'ridan PUT havolasi. */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;

  const restriction = await getRestriction(auth.userId);
  if (restriction) {
    return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  }
  const { filename, contentType } = parsed.data;
  if (!IMAGE_TYPES.includes(contentType)) {
    return mobileJson({ error: "Faqat rasm yuklang" }, { status: 400 });
  }

  const key = buildKey(`avatars/${auth.userId}`, filename);
  const uploadUrl = await presignPut({ bucket: PUBLIC_BUCKET, key, contentType });

  return mobileJson({ uploadUrl, publicUrl: publicUrl(key) });
}
