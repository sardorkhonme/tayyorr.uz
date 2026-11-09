import { db } from "@/lib/db";

/**
 * app.tayyorr.uz "Qo'llanma" bo'limidagi videolar — har bir rol uchun bittadan.
 * Kalitlar src/lib/guide.ts (guideVideoKey) bilan bir xil bo'lishi shart.
 */
export type GuideRole = "ORDERER" | "PREPARER";
export const GUIDE_ROLES: GuideRole[] = ["ORDERER", "PREPARER"];
export const guideVideoKey = (role: GuideRole) => `guideVideo:${role}`;

export type GuideVideo = { url: string; key: string | null; at: string };

export async function getGuideVideos(): Promise<Record<GuideRole, GuideVideo | null>> {
  const rows = await db.appSetting.findMany({ where: { key: { in: GUIDE_ROLES.map(guideVideoKey) } } });
  const out: Record<GuideRole, GuideVideo | null> = { ORDERER: null, PREPARER: null };
  for (const r of GUIDE_ROLES) {
    const row = rows.find((x) => x.key === guideVideoKey(r));
    if (!row) continue;
    try {
      out[r] = JSON.parse(row.value) as GuideVideo;
    } catch {
      out[r] = null;
    }
  }
  return out;
}

export async function setGuideVideo(role: GuideRole, v: { url: string; key: string | null } | null) {
  const key = guideVideoKey(role);
  if (!v) {
    await db.appSetting.deleteMany({ where: { key } });
    return;
  }
  const value = JSON.stringify({ ...v, at: new Date().toISOString() });
  await db.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

/** 1 star narxi (so'm) — src/lib/stars.ts (STAR_PRICE_KEY) bilan bir xil kalit. */
export const STAR_PRICE_KEY = "starPrice";
export async function setStarPrice(n: number) {
  const value = String(n);
  await db.appSetting.upsert({ where: { key: STAR_PRICE_KEY }, create: { key: STAR_PRICE_KEY, value }, update: { value } });
}
