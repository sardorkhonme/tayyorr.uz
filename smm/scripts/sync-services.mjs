/**
 * Provayderdagi xizmatlarni bazaga import qiladi / narxlarini yangilaydi.
 *
 *   npm run sync-services                       — hammasi
 *   npm run sync-services -- instagram,telegram — faqat shu platformalar
 *
 * Narx: provayder rate × SMM_PROVIDER_RATE_UZS × SMM_MARKUP (100 so'mgacha yaxlitlanadi).
 * Mavjud xizmatning `active`, `sort` va `name` qiymatlariga tegilmaydi
 * (admin bazada o'zgartirgan bo'lsa saqlanadi); yangilari `active: true` bilan qo'shiladi.
 */
import { PrismaClient } from "@prisma/client";

const url = process.env.SMM_PROVIDER_URL;
const key = process.env.SMM_PROVIDER_KEY;
const fx = Number(process.env.SMM_PROVIDER_RATE_UZS || 0);
const markup = Number(process.env.SMM_MARKUP || 1.5);

if (!url || !key || !fx) {
  console.error("SMM_PROVIDER_URL, SMM_PROVIDER_KEY va SMM_PROVIDER_RATE_UZS kerak");
  process.exit(1);
}

// src/lib/platforms.ts bilan bir xil
const PLATFORMS = [
  ["instagram", /insta/i],
  ["telegram", /telegram|\btg\b/i],
  ["tiktok", /tik ?tok/i],
  ["youtube", /you ?tube|\byt\b/i],
  ["facebook", /facebook|\bfb\b/i],
  ["twitter", /twitter|\bx\.com\b/i],
];
const detect = (t) => PLATFORMS.find(([, re]) => re.test(t))?.[0] ?? "other";

const only = process.argv[2]?.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

const res = await fetch(url, { method: "POST", body: new URLSearchParams({ key, action: "services" }) });
const list = await res.json();
if (!Array.isArray(list)) {
  console.error("Provayder javobi kutilganidek emas:", list);
  process.exit(1);
}

const db = new PrismaClient();
let created = 0;
let updated = 0;
let skipped = 0;

for (const s of list) {
  const providerId = Number(s.service);
  const providerRate = Number(s.rate);
  const min = Number(s.min);
  const max = Number(s.max);
  if (!providerId || !Number.isFinite(providerRate) || !min || !max) {
    skipped++;
    continue;
  }
  const platform = detect(`${s.category} ${s.name}`);
  if (only?.length && !only.includes(platform)) {
    skipped++;
    continue;
  }
  const rate = Math.max(100, Math.ceil((providerRate * fx * markup) / 100) * 100);
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

  const exists = await db.smmService.findUnique({ where: { providerId }, select: { id: true } });
  if (exists) {
    await db.smmService.update({ where: { providerId }, data: common });
    updated++;
  } else {
    await db.smmService.create({ data: { providerId, name: String(s.name).slice(0, 300), ...common } });
    created++;
  }
}

await db.$disconnect();
console.log(`Tayyor: ${created} yangi, ${updated} yangilandi, ${skipped} o'tkazib yuborildi`);
