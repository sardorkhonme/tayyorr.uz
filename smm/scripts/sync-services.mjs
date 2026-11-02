/**
 * Provayderdagi xizmatlarni bazaga import qiladi / narxlarini yangilaydi.
 *
 *   npm run sync-services                       — hammasi
 *   npm run sync-services -- instagram,telegram — faqat shu platformalar
 *   npm run sync-services -- --dry              — bazaga yozmasdan hisobot
 *
 * Faqat "Default" turdagi xizmatlar olinadi (havola + miqdor). Izoh, username,
 * so'rovnoma kabi qo'shimcha maydon talab qiladigan turlar hozircha o'tkazib yuboriladi.
 *
 * Narx saytda har safar joriy kurs (Markaziy bank) va admin ustamasi bo'yicha hisoblanadi
 * (src/lib/pricing.ts) — bu yerda faqat provayder narxi saqlanadi; `rate` ustuni joriy
 * sozlamalar bo'yicha ma'lumot uchun yoziladi.
 * Mavjud xizmatning `active`, `sort` va `name` qiymatlariga tegilmaydi
 * (admin bazada o'zgartirgan bo'lsa saqlanadi); yangilari `active: true` bilan qo'shiladi.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.SMM_PROVIDER_URL;
const key = process.env.SMM_PROVIDER_KEY;

if (!url || !key) {
  console.error("SMM_PROVIDER_URL va SMM_PROVIDER_KEY kerak");
  process.exit(1);
}

// src/lib/platforms.ts bilan bir xil
const PLATFORMS = [
  ["instagram", /instagram|\big\b|\breels?\b/i],
  ["telegram", /telegram|\btg\b/i],
  ["tiktok", /tik ?tok/i],
  ["youtube", /you ?tube|\byt\b/i],
  ["facebook", /facebook|\bfb\b/i],
  ["twitter", /twitter|\bx\.com\b/i],
];
const match = (t) => PLATFORMS.find(([, re]) => re.test(t))?.[0] ?? null;
// avval kategoriyadan, topilmasa nomdan ("Instant Start" kabi so'zlar adashtirmasin)
const detect = (category, name) => match(category) ?? match(name) ?? "other";

const args = process.argv.slice(2);
const dry = args.includes("--dry");
const only = args
  .find((a) => !a.startsWith("--"))
  ?.split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const res = await fetch(url, { method: "POST", body: new URLSearchParams({ key, action: "services" }) });
const list = await res.json();
if (!Array.isArray(list)) {
  console.error("Provayder javobi kutilganidek emas:", list);
  process.exit(1);
}

const db = dry ? null : new PrismaClient();

// joriy kurs va ustama (faqat `rate` ustuni uchun)
const cbu = await fetch("https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/")
  .then((r) => r.json())
  .catch(() => null);
const fx = Number(cbu?.[0]?.Rate) || 0;
const markupRow = db ? await db.appSetting.findUnique({ where: { key: "smmMarkupPercent" } }) : null;
const markup = 1 + (Number(markupRow?.value ?? 50) || 0) / 100;
let created = 0;
let updated = 0;
let skipped = 0;
let unsupported = 0;
const perPlatform = {};

for (const s of list) {
  const providerId = Number(s.service);
  const providerRate = Number(s.rate);
  const min = Number(s.min);
  const max = Number(s.max);
  if (!providerId || !Number.isFinite(providerRate) || !min || !max) {
    skipped++;
    continue;
  }
  if (s.type && String(s.type).toLowerCase() !== "default") {
    unsupported++;
    continue;
  }
  const platform = detect(String(s.category), String(s.name));
  if (only?.length && !only.includes(platform)) {
    skipped++;
    continue;
  }
  const rate = fx ? Math.max(100, Math.ceil((providerRate * fx * markup) / 100) * 100) : 0;
  const common = {
    platform,
    category: String(s.category).slice(0, 200),
    description: s.description ? String(s.description).slice(0, 2000) : null,
    rate,
    providerRate,
    min,
    max,
    refill: !!s.refill,
  };

  perPlatform[platform] = (perPlatform[platform] ?? 0) + 1;
  if (dry) continue;

  const exists = await db.smmService.findUnique({ where: { providerId }, select: { id: true } });
  if (exists) {
    await db.smmService.update({ where: { providerId }, data: common });
    updated++;
  } else {
    await db.smmService.create({ data: { providerId, name: String(s.name).slice(0, 300), ...common } });
    created++;
  }
}

await db?.$disconnect();
console.log("Platformalar bo'yicha:", perPlatform);
console.log(
  `${dry ? "[DRY] " : ""}Tayyor: ${created} yangi, ${updated} yangilandi, ` +
    `${skipped} o'tkazib yuborildi, ${unsupported} qo'llanmaydigan tur`,
);
