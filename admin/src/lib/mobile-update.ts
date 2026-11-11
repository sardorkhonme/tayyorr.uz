import { db } from "@/lib/db";

/**
 * Android ilovasi yangilanishi — admin tomoni. Format va kalit src/lib/mobile-update.ts bilan bir xil
 * (app.tayyorr.uz middleware va /api/mobile/config shu yozuvni o'qiydi).
 * Versiya: "1.1" (katta.kichik); build raqami = katta*100 + kichik.
 */
export const MOBILE_UPDATE_KEY = "mobileUpdate";
export const DEFAULT_APK_KEY = "app/tayyorr.apk";

export type MobileUpdate = { min: string; latest: string; apkKey: string; notes: string };

export function versionCode(v: string | null | undefined): number {
  const m = /^(\d{1,3})\.(\d{1,2})$/.exec((v ?? "").trim());
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

export async function getMobileUpdate(): Promise<MobileUpdate> {
  const row = await db.appSetting.findUnique({ where: { key: MOBILE_UPDATE_KEY } }).catch(() => null);
  try {
    const v = row?.value ? (JSON.parse(row.value) as Partial<MobileUpdate>) : {};
    const s = (x: unknown) => (typeof x === "string" ? x.trim() : "");
    return {
      min: versionCode(s(v.min)) ? s(v.min) : "",
      latest: versionCode(s(v.latest)) ? s(v.latest) : "",
      apkKey: s(v.apkKey) || DEFAULT_APK_KEY,
      notes: s(v.notes),
    };
  } catch {
    return { min: "", latest: "", apkKey: DEFAULT_APK_KEY, notes: "" };
  }
}

export async function setMobileUpdate(v: MobileUpdate) {
  const value = JSON.stringify(v);
  await db.appSetting.upsert({
    where: { key: MOBILE_UPDATE_KEY },
    update: { value },
    create: { key: MOBILE_UPDATE_KEY, value },
  });
}
