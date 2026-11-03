/**
 * Matnni (ism, email) serverda qisman yashiradi — chinakam to'liq matn
 * hech qachon mijozga (masalan boshqa tayyorlovchilarga) yuborilmaydi,
 * faqat ko'rinadigan qism string sifatida ketadi. `hiddenLen` client
 * tomonda blur effekti uchun ishlatiladi (haqiqiy harflar emas, faqat
 * uzunlik).
 *
 * `ratio` — necha qismi ochiq qolishi (0..1). Standart 0.5 (yarmi ochiq,
 * masalan email uchun). Navbat kabi joylarda kamroq (masalan 0.2 —
 * "boshida ozginasi ochiq") berish mumkin.
 */
export function maskName(
  raw: string,
  ratio: number = 0.5,
): { visible: string; hiddenLen: number } {
  const name = raw.trim() || "Tayyorlovçi";
  const cut = Math.max(1, Math.min(name.length - 1, Math.round(name.length * ratio)));
  return { visible: name.slice(0, cut), hiddenLen: Math.max(2, name.length - cut) };
}
