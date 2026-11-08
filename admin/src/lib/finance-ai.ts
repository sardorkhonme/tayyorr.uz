import { db } from "@/lib/db";
import { PAYOUT_COMMISSION_PERCENT, type Finance } from "@/lib/finance";

/**
 * Moliya — AI tushuntirishi (Google Gemini API, bepul tarif ham ishlaydi).
 * Kalit: GEMINI_API_KEY (admin loyihasi env), model: GEMINI_MODEL (standart — gemini-3.5-flash-lite).
 * AI'ga faqat umumiy raqamlar yuboriladi (ism, telefon, karta yo'q). Natija davr bo'yicha
 * AppSetting "financeAi:<davr>" da saqlanadi — tugma qayta bosilmaguncha yangi so'rov ketmaydi.
 */
export const aiEnabled = () => !!process.env.GEMINI_API_KEY;
const MODEL = () => process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";

/** "!" lar uchun kalitlar — finance-view.tsx dagi kartalar bilan bir xil. */
export const TIP_KEYS = ["profit", "where", "chart", "withdraw", "deposits", "ledger"] as const;
export type TipKey = (typeof TIP_KEYS)[number];
export type FinanceAi = { at: string; model: string; summary: string; tips: Partial<Record<TipKey, string>> };

const key = (periodQuery: string) => `financeAi:${periodQuery}`;

export async function getFinanceAi(periodQuery: string): Promise<FinanceAi | null> {
  const row = await db.appSetting.findUnique({ where: { key: key(periodQuery) } });
  try {
    return row ? (JSON.parse(row.value) as FinanceAi) : null;
  } catch {
    return null;
  }
}

/** Oddiy lotin → saytdagi 2026 alifbosi (sh→ş, ch→ç, o'→ö, g'→ğ). */
export function toSiteAlphabet(s: string) {
  return s
    .replace(/O[ʻ'‘’`]/g, "Ö")
    .replace(/o[ʻ'‘’`]/g, "ö")
    .replace(/G[ʻ'‘’`]/g, "Ğ")
    .replace(/g[ʻ'‘’`]/g, "ğ")
    .replace(/Sh/g, "Ş")
    .replace(/SH/g, "Ş")
    .replace(/sh/g, "ş")
    .replace(/Ch/g, "Ç")
    .replace(/CH/g, "Ç")
    .replace(/ch/g, "ç")
    .replace(/(\w)['’](\w)/g, "$1ʼ$2");
}

/** AI ga boradigan ma'lumot — faqat yig'ma raqamlar (so'm). */
function payload(f: Finance) {
  const t = f.total;
  const a = f.allTime;
  const best = [...f.series].sort((x, y) => y.profit - x.profit)[0];
  return {
    davr: f.period.label,
    davr_boyicha: {
      hamyonlarga_tushgan_pul: t.inflow,
      click_orqali: t.click,
      payme_orqali: t.payme,
      admin_qoshgan: t.manual,
      click_payme_komissiyasi: t.fees,
      kartaga_yechildi_jami: t.payoutGross,
      kartaga_otkazildi: t.payoutSent,
      [`yechish_komissiyasi_${PAYOUT_COMMISSION_PERCENT}_foiz`]: t.payoutFee,
      star_sotuvi: t.stars,
      smm_mijozlar_toladi: t.smmNet,
      smm_provayder_narxi_taxminiy: t.smmCost,
      smm_foyda: t.smmMargin,
      smmcloud_ga_tashlandi: t.depositPaid,
      smmcloud_ga_tashlashda_komissiya: t.depositFees,
      ozi_yechib_olgan: f.withdrawnInRange,
      sof_foyda: t.profit,
      eng_foydali_kun: best && best.profit > 0 ? { kun: best.label, foyda: best.profit } : null,
    },
    butun_vaqt: {
      tolov_tizimlaridan_tushgan: a.realIn,
      tolov_tizimlari_komissiyasi: a.fees,
      kartalarga_otkazildi: a.payoutSent,
      smmcloud_ga_tashlandi: a.depositPaid,
      ozi_yechib_olgan: a.withdrawn,
      bankda: a.cash,
      smmcloud_hisobida: a.providerBalance,
      foydalanuvchilar_hamyonida: a.userBalances,
      yechish_kutilmoqda: a.payoutPending,
      sayt_egasiniki: a.own,
    },
    sozlamalar: {
      click_foiz: f.settings.clickPct,
      payme_foiz: f.settings.paymePct,
      smmcloud_ga_tashlash_foiz: f.settings.deposit,
      smm_ustama_foiz: f.smmMarkup,
      dollar_kursi: f.fx,
    },
  };
}

const SYSTEM = `Sen kichik o'zbek startapi (tayyorr.uz — talabalar uchun ilmiy ishlar platformasi va SMM xizmatlari) egasining moliyaviy maslahatchisisan.
Egasi moliyachi emas: unga oddiy, qisqa, aniq o'zbek tilida (lotin yozuvi) tushuntir. Raqamlarni "so'm" bilan yoz, minglarni bo'sh joy bilan ajrat (10 000 so'm).
Faqat berilgan raqamlarga tayan, raqam o'ylab topma. Muhim: foydalanuvchilar hamyonidagi pul saytniki emas — ular istalgan payt sarflashi yoki yechishi mumkin.
Manfiy raqam bo'lsa, sababini ayt. Oxirida 1-3 ta amaliy maslahat ber (masalan, smmcloud ga kamroq marta, kattaroq summada tashlash).

Javobni FAQAT shu JSON ko'rinishida qaytar, boshqa matnsiz:
{"summary": "4-8 qisqa jumla yoki '- ' bilan boshlanadigan qatorlar (\\n bilan ajrat)",
 "tips": {
  "profit": "shu davrdagi sof foyda nega shuncha — 1-2 jumla",
  "where": "pulning hozir qayerdaligi va 'sayt egasiniki' nimani bildiradi — 1-2 jumla",
  "chart": "kunlik foyda bo'yicha nimaga e'tibor berish kerak — 1 jumla",
  "withdraw": "o'zi uchun qancha yechib olishi mumkin va xavfsizmi — 1 jumla",
  "deposits": "smmcloud ga pul tashlash bo'yicha xulosa — 1 jumla",
  "ledger": "pul harakatlari bo'yicha kuzatuv — 1 jumla"
 }}`;

/** Gemini generateContent (REST): javob matni — candidates[0].content.parts[].text */
async function askGemini(data: unknown): Promise<{ summary: string; tips: Record<string, string> }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY sozlanmagan");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL())}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [{ text: `Moliyaviy ma'lumot (JSON):\n${JSON.stringify(data, null, 1)}` }] }],
      generationConfig: { responseMimeType: "application/json", maxOutputTokens: 2048 },
    }),
    signal: AbortSignal.timeout(45_000),
  });
  const body = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    error?: { message?: string; status?: string };
  } | null;
  if (!res.ok) {
    const msg = body?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(res.status === 429 ? "Bepul limit tugadi — birozdan keyin urinib köring" : `Gemini xatosi: ${msg}`);
  }
  const text = (body?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // ba'zan ```json ... ``` ichida keladi
  const json = text.replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/, "").trim();
  const parsed = JSON.parse(json) as { summary?: unknown; tips?: Record<string, unknown> };
  if (typeof parsed.summary !== "string") throw new Error("AI javobi tuşunarsiz keldi — qayta urinib köring");
  const tips: Record<string, string> = {};
  for (const k of TIP_KEYS) if (typeof parsed.tips?.[k] === "string") tips[k] = parsed.tips[k] as string;
  return { summary: parsed.summary, tips };
}

/** Davr uchun tushuntirish so'raydi va saqlaydi. */
export async function generateFinanceAi(f: Finance): Promise<FinanceAi> {
  const r = await askGemini(payload(f));
  const ai: FinanceAi = {
    at: new Date().toISOString(),
    model: MODEL(),
    summary: toSiteAlphabet(r.summary).slice(0, 4000),
    tips: Object.fromEntries(Object.entries(r.tips).map(([k, v]) => [k, toSiteAlphabet(v).slice(0, 600)])),
  };
  const value = JSON.stringify(ai);
  const k = key(f.period.query);
  await db.appSetting.upsert({ where: { key: k }, create: { key: k, value }, update: { value } });
  return ai;
}
