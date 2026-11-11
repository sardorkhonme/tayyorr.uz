import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { normalizeEmail, verifyOtp } from "@/lib/email-otp";

/** Mobil ilova: kod to'g'ri bo'lsa — yangi parol o'rnatiladi (keyin ilova login/parol bilan kiradi). */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown; password?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || code.length !== 4) return NextResponse.json({ error: "4 xonali kodni kiriting" }, { status: 400 });
  if (password.length < 6 || password.length > 100) {
    return NextResponse.json({ error: "Parol kamida 6 ta belgidan iborat bölsin" }, { status: 400 });
  }
  const user = await db.user.findUnique({ where: { email }, select: { id: true } });
  const v = await verifyOtp(email, code);
  if (!v.ok || !user) {
    const error =
      v.ok || v.reason === "bad_code"
        ? "Kod notöğri. Qayta tekşirib köring"
        : v.reason === "expired"
          ? "Kod muddati tugagan. Yangi kod sörang"
          : "Urinişlar köp böldi. Yangi kod sörang";
    return NextResponse.json({ error }, { status: 400 });
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  await db.activityLog
    .create({ data: { userId: user.id, action: "PROFILE_UPDATE", summary: "Parolni tikladi (mobil ilova, email kod)" } })
    .catch(() => {});
  return NextResponse.json({ ok: true });
}
