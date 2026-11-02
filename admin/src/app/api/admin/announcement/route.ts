import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { adminApiGuard } from "@/lib/admin";

const s = z.string().trim().max(2000).optional().default("");
const schema = z.object({
  title: z.string().trim().min(1).max(200),
  titleRu: s,
  titleEn: s,
  body: s,
  bodyRu: s,
  bodyEn: s,
  buttonText: z.string().trim().max(60).optional().default(""),
  buttonTextRu: z.string().trim().max(60).optional().default(""),
  buttonTextEn: z.string().trim().max(60).optional().default(""),
  buttonUrl: z.string().trim().max(500).optional().default(""),
  role: z.enum(["ORDERER", "PREPARER"]).nullable().optional().default(null),
  active: z.boolean().default(true),
});

/** Yangi e'lon banneri qo'shadi. */
export async function POST(req: Request) {
  const denied = await adminApiGuard();
  if (denied) return denied;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Sarlavha kerak" }, { status: 400 });
  }
  const d = parsed.data;

  const a = await db.announcement.create({
    data: {
      title: d.title,
      titleRu: d.titleRu || null,
      titleEn: d.titleEn || null,
      body: d.body,
      bodyRu: d.bodyRu || null,
      bodyEn: d.bodyEn || null,
      buttonText: d.buttonText || null,
      buttonTextRu: d.buttonTextRu || null,
      buttonTextEn: d.buttonTextEn || null,
      buttonUrl: d.buttonUrl || null,
      role: d.role ?? null,
      active: d.active,
    },
  });

  return NextResponse.json({ ok: true, id: a.id });
}
