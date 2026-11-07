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
