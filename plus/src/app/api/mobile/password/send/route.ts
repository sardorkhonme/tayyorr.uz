import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { emailSchemaMsg, normalizeEmail, sendOtp } from "@/lib/email-otp";

/**
 * Mobil ilova: parolni tiklash — emailga 4 xonali kod (saytdagi havola o'rniga; ilova veb-saytga chiqmaydi).
 * Hisob borligini oshkor qilmaymiz: hisob bo'lmasa ham "yuborildi" deymiz, kod esa faqat bor hisobga ketadi.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  if (!email) return NextResponse.json({ error: emailSchemaMsg }, { status: 400 });
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (user) {
    const r = await sendOtp(email);
    if (!r.ok && !r.waitSec) return NextResponse.json({ error: r.error }, { status: 400 });
    return NextResponse.json({ ok: true, waitSec: r.ok ? 60 : r.waitSec });
  }
  return NextResponse.json({ ok: true, waitSec: 60 });
}
