import { cookies, headers } from "next/headers";

import { db } from "@/lib/db";
import { SSO_COOKIE, verifySso } from "@/lib/sso";

/**
 * smm.tayyorr.uz o'z kirish tizimiga ega emas: foydalanuvchi plus.tayyorr.uz da kiradi,
 * u yerda `.tayyorr.uz` ga qo'yilgan imzolangan SSO belgisi shu yerda o'qiladi.
 * tayyorr+ dan chiqilsa belgi o'chadi — bu yerdan ham avtomatik chiqiladi.
 */
export const PLUS_URL = (process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz").replace(/\/+$/, "");

export async function sessionUserId(): Promise<string | null> {
  return verifySso((await cookies()).get(SSO_COOKIE)?.value);
}

/** Joriy foydalanuvchi (bazadan yangi holatda) yoki null. */
export async function currentUser() {
  const id = await sessionUserId();
  if (!id) return null;
  return db.user.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      name: true,
      login: true,
      email: true,
      avatarUrl: true,
      image: true,
      balance: true,
      walletCode: true,
      bannedUntil: true,
    },
  });
}

/** tayyorr+ dagi kirish sahifasi — kirgach shu sahifaga qaytadi. */
export async function loginUrl(path = "/") {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "smm.tayyorr.uz";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${PLUS_URL}/login?next=${encodeURIComponent(`${proto}://${host}${path}`)}`;
}
