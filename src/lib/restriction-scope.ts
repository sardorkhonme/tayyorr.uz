import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { corsHeaders } from "@/lib/mobile-cors";

/**
 * Qisman cheklovlar (UserRestriction) — admin tanlagan imkoniyatgina yopiladi.
 * SMM uchun tekshiruv — smm-app/src/lib/orders.ts (placeOrder) da shu jadval bo'yicha.
 */
export type RestrictionScope = "smm" | "smm_service" | "uz_orders" | "uz_offers" | "uz_chat" | "payout" | "family";

export const SCOPE_LABEL: Record<RestrictionScope, string> = {
  smm: "Tayyorr SMM",
  smm_service: "Şu SMM xizmati",
  uz_orders: "Buyurtma beriş",
  uz_offers: "Taklif yuboriş",
  uz_chat: "Şaxsiy xabar yoziş",
  payout: "Pul yeçib oliş",
  family: "Tayyorr’s Family guruhiga yoziş",
};

export async function scopedRestriction(userId: string, scope: RestrictionScope, target?: string | null) {
  const scopes: RestrictionScope[] = scope === "smm_service" ? ["smm", "smm_service"] : [scope];
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
    text: `«${label}» sizga ${when} çeklangan${hit.reason ? `. Sabab: ${hit.reason}` : ""}. Savollar bölsa — «tayyorr.uz support».`,
    until: hit.until,
  };
}

/** API uchun: cheklangan bo'lsa 403 javob (mobil — CORS bilan), aks holda null. */
export async function scopedApiError(userId: string, scope: RestrictionScope, target?: string | null, mobile = false) {
  const r = await scopedRestriction(userId, scope, target);
  if (!r) return null;
  return NextResponse.json({ error: r.text, restricted: true }, { status: 403, headers: mobile ? corsHeaders() : {} });
}
