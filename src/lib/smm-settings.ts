import { db } from "@/lib/db";

/**
 * tayyorr+ (smm.tayyorr.uz) narx sozlamalari — umumiy bazadagi AppSetting.
 * Kalitlar smm/src/lib/pricing.ts bilan bir xil bo'lishi shart.
 */
export const SMM_MARKUP_KEY = "smmMarkupPercent";
export const SMM_USD_RATE_KEY = "smmUsdRate";
export const SMM_DEFAULT_MARKUP_PERCENT = 50;

const CBU_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/";

export type SmmUsdRate = { rate: number; date: string | null; at: string };

export async function getSmmSettings() {
  const [markupRow, rateRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: SMM_MARKUP_KEY } }),
    db.appSetting.findUnique({ where: { key: SMM_USD_RATE_KEY } }),
  ]);
  let usd: SmmUsdRate | null = null;
  try {
    usd = rateRow ? (JSON.parse(rateRow.value) as SmmUsdRate) : null;
  } catch {
    usd = null;
  }
  const pct = Number(markupRow?.value);
  return {
    markupPercent: markupRow && Number.isFinite(pct) ? pct : SMM_DEFAULT_MARKUP_PERCENT,
    markupIsDefault: !markupRow,
    usd,
  };
}

export async function setSmmMarkupPercent(pct: number) {
  const value = String(pct);
  await db.appSetting.upsert({
    where: { key: SMM_MARKUP_KEY },
    update: { value },
    create: { key: SMM_MARKUP_KEY, value },
  });
}

/** Markaziy bankdan USD kursini olib saqlaydi. */
export async function refreshSmmUsdRate(): Promise<SmmUsdRate | null> {
  try {
    const res = await fetch(CBU_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as Array<{ Rate?: string; Date?: string }>;
    const rate = Number(data?.[0]?.Rate);
    if (!res.ok || !Number.isFinite(rate) || rate <= 0) return null;
    const usd: SmmUsdRate = { rate, date: data[0].Date ?? null, at: new Date().toISOString() };
    const value = JSON.stringify(usd);
    await db.appSetting.upsert({
      where: { key: SMM_USD_RATE_KEY },
      update: { value },
      create: { key: SMM_USD_RATE_KEY, value },
    });
    return usd;
  } catch {
    return null;
  }
}
