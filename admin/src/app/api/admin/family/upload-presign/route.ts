import { NextResponse } from "next/server";
import { z } from "zod";

import { adminApiGuard } from "@/lib/admin";
import { PRIVATE_BUCKET, buildKey, presignPut } from "@/lib/r2";
import { getSupportUserId } from "@/lib/support";

const schema = z.object({ filename: z.string().min(1).max(200), contentType: z.string().min(1).max(150) });

/** Admin guruhga fayl uchun presigned PUT (R2 private: family/<supportId>/...). */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Notöğri sörov" }, { status: 400 });
  const key = buildKey(`family/${await getSupportUserId()}`, parsed.data.filename);
  const uploadUrl = await presignPut({ bucket: PRIVATE_BUCKET, key, contentType: parsed.data.contentType });
  return NextResponse.json({ uploadUrl, key });
}
