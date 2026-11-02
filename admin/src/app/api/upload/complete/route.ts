import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/auth";
import { db } from "@/lib/db";

const schema = z.object({
  key: z.string().min(1),
  bucket: z.enum(["public", "private"]),
  kind: z.enum(["AVATAR", "ATTACHMENT", "DELIVERABLE"]),
  mimeType: z.string(),
  size: z.number().int().nonnegative(),
  orderId: z.string().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Noto'g'ri so'rov" }, { status: 400 });
  }

  const data = parsed.data;

  const file = await db.fileObject.create({
    data: {
      key: data.key,
      bucket: data.bucket,
      kind: data.kind,
      mimeType: data.mimeType,
      size: data.size,
      uploaderId: session.user.id,
      orderId: data.orderId,
    },
  });

  return NextResponse.json({ ok: true, fileId: file.id });
}
