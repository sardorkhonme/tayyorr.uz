import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { normalizeEmail, verifyOtp } from "@/lib/email-otp";
import { signMobileEmailTicket } from "@/lib/mobile-ticket";
import { TERMS_VERSION } from "@/lib/register";

/**
 * Mobil ilova: kod to'g'ri bo'lsa — hisob (yangi bo'lsa yaratiladi, signupMethod EMAIL) va
 * app.tayyorr.uz da mobil token olish uchun 2 daqiqalik chipta.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; code?: unknown } | null;
  const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
  const code = typeof body?.code === "string" ? body.code.replace(/\D/g, "") : "";
  if (!email || code.length !== 4) return NextResponse.json({ error: "4 xonali kodni kiriting" }, { status: 400 });

  const v = await verifyOtp(email, code);
  if (!v.ok) {
    const error =
      v.reason === "expired"
        ? "Kod muddati tugagan. Yangi kod sörang"
        : v.reason === "too_many"
          ? "Urinişlar köp böldi. Yangi kod sörang"
          : "Kod notöğri. Qayta tekşirib köring";
    return NextResponse.json({ error }, { status: 400 });
  }

  let user = await db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } });
  if (user) {
    if (!user.emailVerified) await db.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
  } else {
    user = await db.user
      .create({
        data: {
          email,
          emailVerified: new Date(),
          signupMethod: "EMAIL",
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
        select: { id: true, emailVerified: true },
      })
      .catch(() => db.user.findUnique({ where: { email }, select: { id: true, emailVerified: true } }));
    if (!user) return NextResponse.json({ error: "Hisob yaratilmadi, qayta urinib köring" }, { status: 500 });
  }
  return NextResponse.json({ ticket: await signMobileEmailTicket(user.id) });
}
