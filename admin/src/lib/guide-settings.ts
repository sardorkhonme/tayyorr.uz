import { db } from "@/lib/db";

/**
 * app.tayyorr.uz "Qo'llanma" bo'limidagi videolar — har bir rol uchun bittadan.
 * Kalitlar src/lib/guide.ts (guideVideoKey) bilan bir xil bo'lishi shart.
 */
export type GuideRole = "ORDERER" | "PREPARER";
export const GUIDE_ROLES: GuideRole[] = ["ORDERER", "PREPARER"];
export const guideVideoKey = (role: GuideRole) => `guideVideo:${role}`;

export type GuideVideo = { id: string; title: string; url: string; key: string | null; at: string };

/** Eski format (bitta obyekt) ham o'qiladi — birinchi video bo'lib chiqadi. */
function parse(value: string | undefined): GuideVideo[] {
  if (!value) return [];
  try {
    const v = JSON.parse(value);
    const arr = Array.isArray(v) ? v : v && typeof v === "object" ? [{ id: "legacy", title: "Video qöllanma", ...v }] : [];
    return arr.filter((x) => x && typeof x.url === "string" && x.url);
  } catch {
    return [];
  }
}

export async function getGuideVideos(role: GuideRole): Promise<GuideVideo[]> {
  const row = await db.appSetting.findUnique({ where: { key: guideVideoKey(role) } });
  return parse(row?.value);
}

export async function getAllGuideVideos(): Promise<Record<GuideRole, GuideVideo[]>> {
  const [o, p] = await Promise.all([getGuideVideos("ORDERER"), getGuideVideos("PREPARER")]);
  return { ORDERER: o, PREPARER: p };
}

export async function saveGuideVideos(role: GuideRole, list: GuideVideo[]) {
  const key = guideVideoKey(role);
  if (list.length === 0) {
    await db.appSetting.deleteMany({ where: { key } });
    return;
  }
  const value = JSON.stringify(list);
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** 1 star narxi (so'm) — src/lib/stars.ts (STAR_PRICE_KEY) bilan bir xil kalit. */
export const STAR_PRICE_KEY = "starPrice";
export async function setStarPrice(n: number) {
  const value = String(n);
  await db.appSetting.upsert({ where: { key: STAR_PRICE_KEY }, create: { key: STAR_PRICE_KEY, value }, update: { value } });
}
