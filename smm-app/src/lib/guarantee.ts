/**
 * Xizmat kafolati (refill) — provayder belgisi (`refill`) har doim ham to'g'ri emas
 * (nomida "Refill: 30 Days" bo'lsa-yu, belgi false bo'lishi mumkin), shuning uchun nomdan ham aniqlanadi.
 * Qo'llanma (/qollanma) shu yorliqlarni tushuntiradi.
 */
export type Guarantee =
  | { kind: "lifetime" }
  | { kind: "days"; days: number }
  /** provayder kafolatli degan, muddati yozilmagan */
  | { kind: "yes" }
  | { kind: "none" };

export function guaranteeOf(name: string, refill: boolean): Guarantee {
  if (/no[\s-]*refill|without refill/i.test(name)) return { kind: "none" };
  if (/lifetime|life\s*time|umrbod/i.test(name)) return { kind: "lifetime" };
  const m = /refill\s*:?\s*(\d+)\s*d/i.exec(name) ?? /(\d+)\s*days?\s*(refill|guarantee)/i.exec(name);
  if (m && Number(m[1]) > 0) return { kind: "days", days: Number(m[1]) };
  if (refill || /refill|guarantee/i.test(name)) return { kind: "yes" };
  return { kind: "none" };
}

export function guaranteeLabel(g: Guarantee) {
  switch (g.kind) {
    case "lifetime":
      return "Umrbod kafolat";
    case "days":
      return `${g.days} kun kafolat`;
    case "yes":
      return "Kafolatli";
    default:
      return "Kafolatsiz";
  }
}

/** Kafolat yorlig'i alohida ko'rsatiladi — nomdagi inglizcha takrori teglardan olib tashlanadi. */
export const isGuaranteeTag = (t: string) => /refill|guarantee/i.test(t);

/**
 * "Tavsiya etiladi / etilmaydi" — qo'llanmadagi qoidalar bo'yicha:
 * bot, katta kamayish (Drop 30%+), faqat bir davlat havolasi, kafolatsiz obunachi — tavsiya etilmaydi.
 */
export function verdictOf(name: string, refill: boolean, kind: string): { ok: boolean; reason: string } {
  if (/\bbots?\b/i.test(name)) return { ok: false, reason: "Bot akkauntlar — tez tuşib ketadi" };
  const drop = /drop\s*:?\s*~?\s*%?\s*(\d+)/i.exec(name);
  if (drop && Number(drop[1]) >= 30) return { ok: false, reason: `Taxminan ${drop[1]}% va undan köpi tuşib ketadi` };
  if (/only\b[^|\]]*\blink/i.test(name)) return { ok: false, reason: "Faqat bitta davlat havolasi uçun işlaydi" };
  const g = guaranteeOf(name, refill);
  if (kind === "followers") {
    return g.kind === "none"
      ? { ok: false, reason: "Kafolatsiz — obunaçilar kamaysa qaytmaydi" }
      : { ok: true, reason: "Kafolatli — kamaysa qayta töldiriladi" };
  }
  return { ok: true, reason: g.kind === "none" ? "Bu tur uçun kafolat şart emas" : "Kafolatli" };
}
