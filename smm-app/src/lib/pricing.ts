import { db } from "@/lib/db";
import { ADJUST_KEY, adjustPct, parseAdjust, type Adjust, type ServiceRef } from "@/lib/smm-adjust";

/**
 * Narxlash: provayder narxi (USD / 1000 dona) × dollar kursi × (1 + ustama%).
 * Kurs — O'zbekiston Markaziy banki (cbu.uz), 6 soatda bir yangilanadi.
 * Ustama — tayyorr.uz admin panelidan (AppSetting "smmMarkupPercent").
 * Xizmat/guruh bo'yicha chegirma yoki ustama — AppSetting "smmAdjust" (lib/smm-adjust.ts).
 * Kalitlar tayyorr.uz dagi src/lib/smm-settings.ts bilan bir xil.
 */
export const MARKUP_KEY = "smmMarkupPercent";
export const USD_RATE_KEY = "smmUsdRate";
const DEFAULT_MARKUP_PERCENT = 50;
const RATE_TTL_MS = 6 * 3600 * 1000;
const CBU_URL = "https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/";

export type Pricing = {
  fx: number; // 1 USD = fx so'm
  rateDate: string | null; // Markaziy bank sanasi
  markupPercent: number;
  adjust: Adjust;
};

type StoredRate = { rate: number; date: string | null; at: string };

export async function fetchCbuUsdRate(): Promise<{ rate: number; date: string | null } | null> {
  try {
    const res = await fetch(CBU_URL, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const data = (await res.json()) as Array<{ Rate?: string; Date?: string }>;
    const rate = Number(data?.[0]?.Rate);
    if (!res.ok || !Number.isFinite(rate) || rate <= 0) return null;
    return { rate, date: data[0].Date ?? null };
  } catch {
    return null;
  }
}

let cache: { value: Pricing; until: number } | null = null;

export async function getPricing(): Promise<Pricing | null> {
  if (cache && cache.until > Date.now()) return cache.value;

  const [markupRow, rateRow, adjustRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: MARKUP_KEY } }),
    db.appSetting.findUnique({ where: { key: USD_RATE_KEY } }),
    db.appSetting.findUnique({ where: { key: ADJUST_KEY } }),
  ]);

  let stored: StoredRate | null = null;
  try {
    stored = rateRow ? (JSON.parse(rateRow.value) as StoredRate) : null;
  } catch {
    stored = null;
  }

  if (!stored || Date.now() - new Date(stored.at).getTime() > RATE_TTL_MS) {
    const fresh = await fetchCbuUsdRate();
    if (fresh) {
      stored = { ...fresh, at: new Date().toISOString() };
      const value = JSON.stringify(stored);
      await db.appSetting
        .upsert({ where: { key: USD_RATE_KEY }, update: { value }, create: { key: USD_RATE_KEY, value } })
        .catch(() => {});
    }
  }
  if (!stored?.rate) return null;

  const pct = Number(markupRow?.value);
  const value: Pricing = {
    fx: stored.rate,
    rateDate: stored.date,
    markupPercent: Number.isFinite(pct) && pct >= 0 ? pct : DEFAULT_MARKUP_PERCENT,
    adjust: parseAdjust(adjustRow?.value ?? null),
  };
  cache = { value, until: Date.now() + 60_000 };
  return value;
}

/**
 * 1000 dona uchun sotuv narxi (so'm), 100 so'mgacha yuqoriga yaxlitlanadi.
 * `service` berilsa — admin qo'ygan chegirma/ustama ham qo'shiladi.
 */
export function rateFor(providerRate: number, p: Pricing, service?: ServiceRef) {
  const adj = service ? adjustPct(p.adjust, service) : 0;
  const raw = providerRate * p.fx * (1 + p.markupPercent / 100) * (1 + adj / 100);
  return Math.max(100, Math.ceil(raw / 100) * 100);
}

/**
 * Saytda ko'rsatish uchun narx: chegirma bo'lsa — eski narx va foizi ham.
 * Ustama (musbat foiz) mijozga ko'rsatilmaydi — u shunchaki narxning ichida.
 */
export function priceInfo(providerRate: number, p: Pricing, service: ServiceRef) {
  const rate = rateFor(providerRate, p, service);
  const adj = adjustPct(p.adjust, service);
  if (adj >= 0) return { rate, oldRate: null, discount: 0 };
  const oldRate = rateFor(providerRate, p);
  const discount = Math.round(-adj);
  return oldRate > rate && discount > 0 ? { rate, oldRate, discount } : { rate, oldRate: null, discount: 0 };
}
