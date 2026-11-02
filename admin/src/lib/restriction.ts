import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";

export interface Restriction {
  until: Date;
  reason: string | null;
  permanent: boolean;
}

const PERMANENT_AFTER_YEARS = 50;

export function readRestriction(user: {
  bannedUntil: Date | null;
  banReason: string | null;
}): Restriction | null {
  if (!user.bannedUntil) return null;
  if (user.bannedUntil.getTime() <= Date.now()) return null;
  const years =
    (user.bannedUntil.getTime() - Date.now()) / (365 * 24 * 3600 * 1000);
  return {
    until: user.bannedUntil,
    reason: user.banReason,
    permanent: years > PERMANENT_AFTER_YEARS,
  };
}

export async function getRestriction(userId: string): Promise<Restriction | null> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { bannedUntil: true, banReason: true },
  });
  if (!u) return null;
  return readRestriction(u);
}

/** Cheklangan foydalanuvchini /messages ga qaytaradi (landing + messenger'dan boshqa joy yo'q). */
export async function blockIfRestricted(userId: string) {
  const r = await getRestriction(userId);
  if (r) redirect("/messages");
}

/** API route'lar uchun: cheklangan bo'lsa 403 javob, aks holda null. */
export async function restrictionApiError(userId: string) {
  const r = await getRestriction(userId);
  if (!r) return null;
  return NextResponse.json({ error: restrictionText(r) }, { status: 403 });
}

export function restrictionText(r: Restriction) {
  const when = r.permanent ? "muddatsiz" : shortDateTime(r.until);
  return `Hisobingiz ${when} cheklangan${
    r.reason ? `. Sabab: ${r.reason}` : ""
  }. Savollaringiz bo'lsa «tayyorr.uz support» bilan yozishing.`;
}
