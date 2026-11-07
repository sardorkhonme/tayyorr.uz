import { db } from "@/lib/db";

/**
 * "Texnik ishlar" rejimi sozlamasi (AppSetting "maintenance"). Saytlar uni middleware'da o'qiydi:
 * src|plus|smm-app/src/lib/maintenance.ts (format bir xil bo'lishi shart).
 */
export const MAINTENANCE_KEY = "maintenance";
export const DEFAULT_MESSAGE = "Saytda texnik işlar olib borilmoqda. Tez orada qaytamiz!";

export type Maintenance = { on: boolean; message: string; allow: string[]; since?: string | null };

export async function getMaintenance(): Promise<Maintenance> {
  const row = await db.appSetting.findUnique({ where: { key: MAINTENANCE_KEY } });
  try {
    const v = row ? (JSON.parse(row.value) as Partial<Maintenance>) : {};
    return {
      on: v.on === true,
      message: typeof v.message === "string" && v.message.trim() ? v.message : DEFAULT_MESSAGE,
      allow: Array.isArray(v.allow) ? v.allow.filter((x): x is string => typeof x === "string") : [],
      since: typeof v.since === "string" ? v.since : null,
    };
  } catch {
    return { on: false, message: DEFAULT_MESSAGE, allow: [], since: null };
  }
}

export async function saveMaintenance(m: Maintenance) {
  const value = JSON.stringify(m);
  await db.appSetting.upsert({ where: { key: MAINTENANCE_KEY }, create: { key: MAINTENANCE_KEY, value }, update: { value } });
}

export const MAINT_USER_SELECT = { id: true, name: true, firstName: true, lastName: true, login: true, avatarUrl: true, image: true } as const;
