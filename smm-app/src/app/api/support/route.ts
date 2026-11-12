import { NextResponse } from "next/server";
import { z } from "zod";

import { currentUser } from "@/lib/session";
import { listSupportMessages, sendSupportMessage } from "@/lib/support";

/** Support suhbati: ?open=1 — oyna ochiq (javoblar o'qilgan deb belgilanadi). */
export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });
  const open = new URL(req.url).searchParams.get("open") === "1";
  // balans ham — hamyon o'zgarsa sahifa yangilanadi (support-widget)
  return NextResponse.json({ ...(await listSupportMessages(user.id, open)), balance: user.balance });
}

const MAX_IMAGE = 4 * 1024 * 1024; // Vercel so'rov chegarasi ~4.5MB — rasm brauzerda kichraytirib yuboriladi
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const textSchema = z.string().trim().max(2000, "Xabar juda uzun");

/** Matn (JSON) yoki rasm + izoh (multipart: file, text). Bu yerdan faqat rasm yuboriladi. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Avval kiring" }, { status: 401 });

  let raw: unknown = "";
  let replyToId: string | null = null;
  let image: { name: string; type: string; bytes: Uint8Array } | undefined;
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Notöğri söröv" }, { status: 400 });
    raw = form.get("text") ?? "";
    const r = form.get("replyToId");
    replyToId = typeof r === "string" && r ? r.slice(0, 40) : null;
    const f = form.get("file");
    if (f instanceof File && f.size > 0) {
      if (!IMAGE_TYPES.includes(f.type)) return NextResponse.json({ error: "Faqat rasm yuboriş mumkin" }, { status: 400 });
      if (f.size > MAX_IMAGE) return NextResponse.json({ error: "Rasm juda katta (4 MB gaça)" }, { status: 400 });
      image = { name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) };
    }
  } else {
    const j = (await req.json().catch(() => null)) as { text?: unknown; replyToId?: unknown } | null;
    raw = j?.text ?? "";
    replyToId = typeof j?.replyToId === "string" && j.replyToId ? j.replyToId.slice(0, 40) : null;
  }
  const parsed = textSchema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Xabar yozing" }, { status: 400 });
  if (!parsed.data && !image) return NextResponse.json({ error: "Xabar yozing" }, { status: 400 });

  const message = await sendSupportMessage(user.id, parsed.data, image, replyToId).catch((e) => {
    console.error("support send", e);
    return null;
  });
  if (!message) return NextResponse.json({ error: "Yuborilmadi, qayta urinib köring" }, { status: 500 });
  return NextResponse.json({ message });
}
