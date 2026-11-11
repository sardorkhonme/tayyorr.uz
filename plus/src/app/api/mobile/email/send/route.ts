import { NextResponse } from "next/server";

import { emailHasAccount, emailSchemaMsg, normalizeEmail, sendOtp } from "@/lib/email-otp";

/** Mobil ilova: ro'yxatdan o'tish — emailga 4 xonali kod (saytdagi bilan bir xil cheklovlar). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  if (!email) return NextResponse.json({ error: emailSchemaMsg }, { status: 400 });
  if (await emailHasAccount(email)) {
    return NextResponse.json(
      { error: "Bu email bilan hisob allaqaçon mavjud. Kiriş sahifasidan kiring.", exists: true },
      { status: 409 },
    );
  }
  const r = await sendOtp(email);
  // 60 soniya o'tmagan bo'lsa — oldingi kod hali amal qiladi, kod sahifasiga o'taveradi
  if (!r.ok && !r.waitSec) return NextResponse.json({ error: r.error }, { status: 400 });
  return NextResponse.json({ ok: true, email, waitSec: r.ok ? 60 : r.waitSec });
}
