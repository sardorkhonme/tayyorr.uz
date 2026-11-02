import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { detectPlatform } from "@/lib/platforms";
import { getPricing, rateFor } from "@/lib/pricing";
import { fetchServices, providerConfigured } from "@/lib/provider";

/**
 * Provayder xizmatlarini bazaga avtomatik tortadi (qo'lda skript shart emas):
 * - yangilari qo'shiladi, narx/limit o'zgarganlari yangilanadi;
 * - provayderda yo'qolganlari yashiriladi (active: false), qaytsa — qayta ochiladi;
 * - faqat "Default" tur (havola + miqdor) olinadi;
 * - mavjud xizmatning nomi va tartibiga tegilmaydi.
 */
const SYNCED_AT_KEY = "smmServicesSyncedAt";
const INTERVAL_MS = 6 * 3600 * 1000;

export type SyncResult = { created: number; updated: number; hidden: number; unsupported: number };

export async function syncServices(): Promise<SyncResult> {
  const [list, pricing] = await Promise.all([fetchServices(), getPricing()]);
  const existing = await db.smmService.findMany({
    select: {
      providerId: true,
      platform: true,
      category: true,
      description: true,
      providerRate: true,
      min: true,
      max: true,
      refill: true,
      active: true,
    },
  });
  const byId = new Map(existing.map((e) => [e.providerId, e]));

  const seen = new Set<number>();
  const toCreate: Prisma.SmmServiceCreateManyInput[] = [];
  let updated = 0;
  let unsupported = 0;

  for (const s of list) {
    if (s.type && String(s.type).toLowerCase() !== "default") {
      unsupported++;
      continue;
    }
    const providerId = Number(s.service);
    const providerRate = Number(s.rate);
    const min = Number(s.min);
    const max = Number(s.max);
    if (!providerId || !Number.isFinite(providerRate) || !min || !max) continue;
    seen.add(providerId);

    const data = {
      platform: detectPlatform(String(s.category), String(s.name)),
      category: String(s.category).slice(0, 200),
      description: s.description ? String(s.description).slice(0, 2000) : null,
      providerRate,
      min,
      max,
      refill: !!s.refill,
    };
    // `rate` — joriy sozlamalar bo'yicha ma'lumot uchun (saytda har safar qayta hisoblanadi)
    const rate = pricing ? rateFor(providerRate, pricing) : 0;

    const old = byId.get(providerId);
    if (!old) {
      toCreate.push({ providerId, name: String(s.name).slice(0, 300), rate, ...data });
      continue;
    }
    const changed =
      !old.active ||
      old.platform !== data.platform ||
      old.category !== data.category ||
      old.description !== data.description ||
      old.providerRate !== providerRate ||
      old.min !== min ||
      old.max !== max ||
      old.refill !== data.refill;
    if (changed) {
      await db.smmService.update({ where: { providerId }, data: { ...data, rate, active: true } });
      updated++;
    }
  }

  const created = toCreate.length
    ? (await db.smmService.createMany({ data: toCreate, skipDuplicates: true })).count
    : 0;
  const hidden = (
    await db.smmService.updateMany({
      where: { active: true, providerId: { notIn: [...seen] } },
      data: { active: false },
    })
  ).count;

  return { created, updated, hidden, unsupported };
}

/**
 * 6 soatda bir marta sinxronlaydi. Bir vaqtda bir nechta chaqirilsa ham faqat
 * bittasi ishlaydi (vaqt belgisi shartli yoziladi). `force` — muddatni kutmaydi.
 */
export async function maybeSyncServices(force = false): Promise<SyncResult | null> {
  if (!providerConfigured()) return null;

  const row = await db.appSetting.findUnique({ where: { key: SYNCED_AT_KEY } });
  const last = row ? new Date(row.value).getTime() : 0;
  if (!force && Date.now() - last < INTERVAL_MS) return null;

  const now = new Date().toISOString();
  const claimed = row
    ? (await db.appSetting.updateMany({ where: { key: SYNCED_AT_KEY, value: row.value }, data: { value: now } }))
        .count === 1
    : await db.appSetting
        .create({ data: { key: SYNCED_AT_KEY, value: now } })
        .then(() => true)
        .catch(() => false);
  if (!claimed) return null;

  try {
    return await syncServices();
  } catch (e) {
    // xato bo'lsa keyingi chaqiruvda qayta urinsin
    await db.appSetting.updateMany({ where: { key: SYNCED_AT_KEY, value: now }, data: { value: row?.value ?? "1970-01-01T00:00:00.000Z" } });
    console.error("[smm] syncServices", e);
    return null;
  }
}
