import { randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { adminApiGuard } from "@/lib/admin";
import { db } from "@/lib/db";
import { PLUS_URL } from "@/lib/site";

/** Kalit muddati — admin tugmani bosgach, yangi oyna darhol ochiladi. */
const TTL_MS = 60 * 1000;

/**
 * Admin foydalanuvchi akkauntiga tekshirish uchun kiradi: bir martalik kalit (VerificationToken,
 * identifier "plus-admin:<userId>") yaratiladi va tayyorr+ /app-login?ticket=… manzili qaytariladi.
 * tayyorr+ kalitni bir marta ishlatib sessiya ochadi (plus/src/auth.ts — "app-ticket"),
 * SSO orqali app va SMM ham shu foydalanuvchi bilan ochiladi. Kirish foydalanuvchi jurnalida
 * "admin tekshiruvi" deb, Loglarda esa admin amali sifatida yoziladi.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await adminApiGuard();
  if (denied) return denied;
  const { id } = await params;
  const user = await db.user.findUnique({ where: { id }, select: { id: true, isSupport: true, isPlatform: true } });
  if (!user || user.isPlatform) return NextResponse.json({ error: "Foydalanuvçi topilmadi" }, { status: 404 });

  await db.verificationToken.deleteMany({ where: { identifier: `plus-admin:${id}` } }).catch(() => {});
  const token = randomBytes(32).toString("base64url");
  await db.verificationToken.create({
    data: { identifier: `plus-admin:${id}`, token, expires: new Date(Date.now() + TTL_MS) },
  });
  return NextResponse.json({ url: `${PLUS_URL.replace(/\/+$/, "")}/app-login?ticket=${token}` });
}
