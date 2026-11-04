/**
 * Provayder (SMM panel) inglizcha xatolarini o'zbekchaga o'giradi.
 * - `user`  — mijozga ko'rsatiladigan izoh (ichki sabablar — masalan provayder balansi — oshkor qilinmaydi);
 * - `admin` — admin/Telegram uchun izoh (asl matn qavs ichida alohida qo'shiladi).
 */
type Rule = { match: RegExp; user: (m: RegExpMatchArray) => string; admin: (m: RegExpMatchArray) => string };

const TRY_LATER = "Bu xizmat hozir vaqtinça işlamayapti. Birozdan keyin qayta urinib köring yoki boşqa xizmatni tanlang.";

const RULES: Rule[] = [
  {
    match: /not enough (funds|money|balance)|insufficient (funds|balance)|low balance/i,
    user: () => TRY_LATER,
    admin: () => "Provayder hisobida pul yetarli emas — balansni töldiring",
  },
  {
    match: /active order.*link|order with (this|the same) link|link.*(already|still).*(active|in progress|processing)|duplicate/i,
    user: () => "Bu havolaga hali tugallanmagan boşqa buyurtma bor. U bajarilgaç qayta urinib köring.",
    admin: () => "Shu havolaga provayderda faol buyurtma bor",
  },
  {
    match: /quantity.*(less|lower|smaller) than.*?(\d[\d\s,]*)?$/i,
    user: (m) => (m[2] ? `Miqdor juda kam — kamida ${m[2].trim()} ta böliši kerak.` : "Miqdor juda kam."),
    admin: () => "Miqdor provayder minimalidan kam",
  },
  {
    match: /quantity.*(more|greater|bigger|higher) than.*?(\d[\d\s,]*)?$/i,
    user: (m) => (m[2] ? `Miqdor juda köp — köpi bilan ${m[2].trim()} ta böliši mumkin.` : "Miqdor juda köp."),
    admin: () => "Miqdor provayder maksimalidan köp",
  },
  {
    match: /private|closed account|account is closed/i,
    user: () => "Akkaunt yopiq (private). Profilni oçiq qiling va qayta urinib köring.",
    admin: () => "Akkaunt yopiq (private)",
  },
  {
    match: /(user(name)?|account|profile|channel|post|page) (not found|does ?n.t exist|is not available)/i,
    user: () => "Havoladagi akkaunt yoki post topilmadi. Havolani tekşirib, qayta urinib köring.",
    admin: () => "Havoladagi akkaunt/post topilmadi",
  },
  {
    match: /(incorrect|invalid|wrong|bad) (link|url)|link.*(incorrect|invalid)/i,
    user: () => "Havola notöğri. Havolani tekşirib, qayta urinib köring.",
    admin: () => "Havola notöğri",
  },
  {
    match: /(incorrect|invalid|wrong) service|service.*(not found|disabled|not active|inactive|unavailable|paused)/i,
    user: () => "Bu xizmat hozir mavjud emas. Iltimos, boşqa xizmatni tanlang.",
    admin: () => "Xizmat provayderda öçirilgan yoki topilmadi",
  },
  {
    match: /(incorrect|invalid|wrong) (api )?key|api key|unauthori[sz]ed|access denied/i,
    user: () => TRY_LATER,
    admin: () => "Provayder API kaliti notöğri yoki ruxsat yöq",
  },
  {
    match: /(incorrect|invalid|wrong) order id|order not found/i,
    user: () => "Buyurtma topilmadi.",
    admin: () => "Provayderda bunday buyurtma raqami yöq",
  },
  {
    match: /incorrect request|invalid request|bad request|missing/i,
    user: () => TRY_LATER,
    admin: () => "Provayderga yuborilgan söröv notöğri",
  },
  {
    match: /HTTP \d+|timeout|timed out|fetch failed|network/i,
    user: () => TRY_LATER,
    admin: () => "Provayder javob bermadi (tarmoq/server xatosi)",
  },
];

/** Bizning o'zbekcha ichki xabarlarimiz ("Provayder sozlanmagan" va h.k.) — mijozga ichki sabab ko'rsatilmaydi. */
const UZBEK = /[şçğöʼ]|provayder/i;

export function explainProviderError(raw: string) {
  const text = raw.trim();
  for (const r of RULES) {
    const m = text.match(r.match);
    if (m) return { user: r.user(m), admin: UZBEK.test(text) ? r.admin(m) : `${r.admin(m)} (${text})` };
  }
  if (UZBEK.test(text)) return { user: TRY_LATER, admin: text };
  return {
    user: "Buyurtmani qabul qilib bölmadi. Birozdan keyin qayta urinib köring.",
    admin: `Provayder xatosi (${text})`,
  };
}
