#!/usr/bin/env node
/**
 * Bazadagi admin kontentini yangi alifboga o'tkazish (faqat o'zbekcha maydonlar;
 * ru/en tarjimalar, foydalanuvchi xabarlari va ismlariga tegilmaydi).
 *   node scripts/alphabet-2026-db.mjs          — faqat ko'rsatadi
 *   node scripts/alphabet-2026-db.mjs --apply  — bazaga yozadi
 */
import { PrismaClient } from "@prisma/client";
import { convertText } from "./alphabet-2026.mjs";

const apply = process.argv.includes("--apply");
const db = new PrismaClient();

const TARGETS = [
  { model: "announcement", label: "E'lon banneri", fields: ["title", "body", "buttonText"] },
  { model: "landingFaq", label: "Landing FAQ", fields: ["question", "answer"] },
  { model: "landingVideo", label: "Landing video", fields: ["title"] },
  { model: "landingPhoneSlide", label: "Telefon slaydi", fields: ["title", "subtitle"] },
];

let total = 0;
for (const t of TARGETS) {
  const rows = await db[t.model].findMany({ select: Object.fromEntries([["id", true], ...t.fields.map((f) => [f, true])]) });
  for (const r of rows) {
    const data = {};
    for (const f of t.fields) {
      if (typeof r[f] !== "string") continue;
      const conv = convertText(r[f]);
      if (conv !== r[f]) data[f] = conv;
    }
    if (!Object.keys(data).length) continue;
    total++;
    console.log(`\n[${t.label}] ${r.id}`);
    for (const [f, v] of Object.entries(data)) console.log(`  ${f}:\n    - ${r[f].slice(0, 160)}\n    + ${v.slice(0, 160)}`);
    if (apply) await db[t.model].update({ where: { id: r.id }, data });
  }
}
console.log(`\n${apply ? "Yozildi" : "Ko'rsatildi (yozilmadi)"}: ${total} ta yozuv`);
await db.$disconnect();
