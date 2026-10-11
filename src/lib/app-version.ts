import { db } from "@/lib/db";

/**
 * Sayt va mobil ilovaning joriy versiyasi. Har yangilanishda oshiriladi
 * (mobile/pubspec.yaml dagi `version` bilan bir xil saqlang).
 * Admin "Mobil ilova" sahifasidan boshqa yorliq qo'yishi mumkin — u ustun turadi.
 */
export const APP_VERSION = "1.0.4";

const KEY = "versionLabel";

/** Ko'rsatiladigan versiya yorlig'i, masalan "v1.0.2". */
export async function getVersionLabel(): Promise<string> {
  const row = await db.appSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  const v = row?.value?.trim();
  return v ? v : `v${APP_VERSION}`;
}

/** Admin qo'ygan yorliq (bo'sh — avtomatik). */
export async function getCustomVersionLabel(): Promise<string> {
  const row = await db.appSetting.findUnique({ where: { key: KEY } }).catch(() => null);
  return row?.value ?? "";
}

export async function setVersionLabel(value: string) {
  const v = value.trim();
  if (!v) {
    await db.appSetting.delete({ where: { key: KEY } }).catch(() => {});
    return;
  }
  await db.appSetting.upsert({ where: { key: KEY }, update: { value: v }, create: { key: KEY, value: v } });
}
