import { NextResponse } from "next/server";

import { db } from "@/lib/db";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
const REF_COOKIE = "tyr_ref";
const UREF_COOKIE = "tyr_uref"; // shaxsiy (foydalanuvchidan-foydalanuvchiga) referal
const REF_MAX_AGE = 60 * 60 * 24 * 30; // 30 kun

/**
 * Tashrif havolasi: /r/<code>
 * Avval admin yaratgan marketing havolasi (ReferralLink) tekshiriladi;
 * topilmasa, `code` biror foydalanuvchining ID'si bo'lishi mumkin —
 * shaxsiy referal havolasi (/r/<userId>). Login emas, ID ishlatiladi —
 * shunda havolaga qarab bu referal ekanini yoki kim taklif qilayotganini
 * bilib bo'lmaydi. Tashrif sonini oshiradi, brauzerga referal cookie
 * qo'yadi va bosh sahifaga yo'naltiradi. Foydalanuvchi keyinroq
 * ro'yxatdan o'tsa (onboarding), shu cookie orqali qaysi havoladan/kimdan
 * kelgani aniqlanadi.
 */
/**
 * Oxirgi ochilgan havola hisoblanadi: yangi cookie qo'yiladi, ikkinchi turdagi
 * eski cookie o'chiriladi — aks holda avval ochilgan shaxsiy referal 30 kun
 * saqlanib, keyingi tashrif havolasi bilan birga yozilib qolardi.
 * Cookie butun .tayyorr.uz uchun (ro'yxatdan o'tish plus.tayyorr.uz da);
 * domen bo'linishidan oldingi faqat shu host'ga yozilgan eski cookie ham o'chiriladi.
 * Set-Cookie qo'lda — bir nomni ikki xil domen bilan o'chirish uchun.
 */
function withRefCookie(req: Request, res: NextResponse, keep: { name: string; value: string }) {
  const host = new URL(req.url).hostname;
  const shared = host === "tayyorr.uz" || host.endsWith(".tayyorr.uz");
  const base = "Path=/; SameSite=Lax; Secure";
  const dom = shared ? "; Domain=.tayyorr.uz" : "";
  for (const name of [REF_COOKIE, UREF_COOKIE]) {
    // eski host-only nusxa (domen bo'linishidan oldin)
    if (shared) res.headers.append("Set-Cookie", `${name}=; Max-Age=0; ${base}`);
    if (name !== keep.name) res.headers.append("Set-Cookie", `${name}=; Max-Age=0; ${base}${dom}`);
  }
  res.headers.append(
    "Set-Cookie",
    `${keep.name}=${encodeURIComponent(keep.value)}; Max-Age=${REF_MAX_AGE}; ${base}${dom}`,
  );
  return res;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const home = new URL("/", SITE_URL);

  const link = await db.referralLink
    .findUnique({ where: { code: code.toUpperCase() } })
    .catch(() => null);

  if (link) {
    await db.referralLink
      .update({ where: { id: link.id }, data: { visits: { increment: 1 } } })
      .catch(() => {});
    return withRefCookie(req, NextResponse.redirect(home), { name: REF_COOKIE, value: link.code });
  }

  // 2026-09-15 gacha shaxsiy havola login bilan berilgan (/r/<login>) — u ham ishlasin
  const referrer =
    (await db.user.findUnique({ where: { id: code }, select: { id: true } }).catch(() => null)) ??
    (await db.user
      .findFirst({ where: { login: { equals: code, mode: "insensitive" } }, select: { id: true } })
      .catch(() => null));

  if (referrer) {
    return withRefCookie(req, NextResponse.redirect(home), { name: UREF_COOKIE, value: referrer.id });
  }

  return NextResponse.redirect(home);
}
