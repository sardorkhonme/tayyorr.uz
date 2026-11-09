import { db } from "@/lib/db";

/**
 * Buyurtmaga ariza ("men qilaman") yuborish uchun minimal star — admin belgilaydi.
 * Kalit src/lib/stars.ts (MIN_OFFER_STARS_KEY) bilan bir xil; bo'lmasa — 2.
 */
export const MIN_OFFER_STARS_KEY = "minOfferStars";
export const DEFAULT_MIN_OFFER_STARS = 2;

export async function getMinOfferStars(): Promise<number> {
  const row = await db.appSetting.findUnique({ where: { key: MIN_OFFER_STARS_KEY } });
  const n = Number(row?.value);
  return Number.isInteger(n) && n >= 1 && n <= 1000 ? n : DEFAULT_MIN_OFFER_STARS;
}

export async function setMinOfferStars(n: number) {
  const value = String(n);
  await db.appSetting.upsert({ where: { key: MIN_OFFER_STARS_KEY }, create: { key: MIN_OFFER_STARS_KEY, value }, update: { value } });
}
