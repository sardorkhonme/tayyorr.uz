import { NextResponse } from "next/server";
import { z } from "zod";

import { PRIVATE_BUCKET, buildKey, presignPut } from "@/lib/r2";
import { requireMobileAuth } from "@/lib/mobile-auth";
import { mobileJson } from "@/lib/mobile-cors";
import { getRestriction, restrictionText } from "@/lib/restriction";

export { OPTIONS } from "@/lib/mobile-cors";

const schema = z.object({ filename: z.string().min(1).max(200), contentType: z.string().min(1).max(150) });

/** Guruhga fayl uchun presigned PUT (R2 private: family/<userId>/...). */
export async function POST(req: Request) {
  const auth = await requireMobileAuth(req);
  if (auth instanceof NextResponse) return auth;
  const restriction = await getRestriction(auth.userId);
  if (restriction) return mobileJson({ error: restrictionText(restriction) }, { status: 403 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return mobileJson({ error: "Notöğri sörov" }, { status: 400 });
  const key = buildKey(`family/${auth.userId}`, parsed.data.filename);
  const uploadUrl = await presignPut({ bucket: PRIVATE_BUCKET, key, contentType: parsed.data.contentType });
  return mobileJson({ uploadUrl, key });
}
