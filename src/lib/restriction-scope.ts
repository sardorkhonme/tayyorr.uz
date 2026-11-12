import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { corsHeaders } from "@/lib/mobile-cors";

/**
 * Qisman cheklovlar (UserRestriction) — admin tanlagan imkoniyatgina yopiladi.
 * SMM uchun tekshiruv — smm-app/src/lib/orders.ts (placeOrder) da shu jadval bo'yicha.
 */
export type RestrictionScope =
  | "smm"
  | "smm_service"
  | "uz_all"
  | "uz_orders"
  | "uz_offers"
  | "uz_chat"
  | "payout"
  | "topup"
  | "family";

/** Foydalanuvchiga ko'rinadigan nom — qaysi tizimda va nima cheklangani. */
export const SCOPE_LABEL: Record<RestrictionScope, string> = {
  smm: "Tayyorr SMM — butunlay",
  smm_service: "Tayyorr SMM — şu xizmat",
  uz_all: "Tayyorr.uz — butunlay",
  uz_orders: "Tayyorr.uz — buyurtma beriş",
  uz_offers: "Tayyorr.uz — taklif yuboriş",
  uz_chat: "Tayyorr.uz — şaxsiy xabar yoziş",
  payout: "Hamyon — pul yeçib oliş",
  topup: "Hamyon — hisobni töldiriş",
  family: "Tayyorr’s Family — guruhga yoziş",
};

/** «Tayyorr.uz — butunlay» uning barcha qismlarini ham yopadi. */
const PARENT: Partial<Record<RestrictionScope, RestrictionScope>> = {
  uz_orders: "uz_all",
  uz_offers: "uz_all",
  uz_chat: "uz_all",
  smm_service: "smm",
};

export async function scopedRestriction(userId: string, scope: RestrictionScope, target?: string | null) {
  const scopes: RestrictionScope[] = PARENT[scope] ? [PARENT[scope]!, scope] : [scope];
  const rows = await db.userRestriction.findMany({
    where: { userId, until: { gt: new Date() }, scope: { in: scopes } },
    orderBy: { until: "desc" },
  });
  const hit = rows.find((r) => r.scope !== "smm_service" || (target && r.target === target));
  if (!hit) return null;
  const permanent = hit.until.getTime() - Date.now() > 50 * 365 * 24 * 3600 * 1000;
  const label = SCOPE_LABEL[hit.scope as RestrictionScope] ?? "Bu imkoniyat";
  const when = permanent ? "muddatsiz" : `${shortDateTime(hit.until)} gaça`;
  return {
    text: `Sizga çeklov qöyilgan: «${label}» — ${when}${hit.reason ? `. Sabab: ${hit.reason}` : ""}. Savollar bölsa — «tayyorr.uz support».`,
    title: label,
    until: hit.until,
  };
}

/** API uchun: cheklangan bo'lsa 403 javob (mobil — CORS bilan), aks holda null. */
export async function scopedApiError(userId: string, scope: RestrictionScope, target?: string | null, mobile = false) {
  const r = await scopedRestriction(userId, scope, target);
  if (!r) return null;
  return NextResponse.json({ error: r.text, restricted: true }, { status: 403, headers: mobile ? corsHeaders() : {} });
}
