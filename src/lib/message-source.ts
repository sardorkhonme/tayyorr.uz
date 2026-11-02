/**
 * Xabar qaysi tizimdan yozilgani. tayyorr+ (smm.tayyorr.uz) dan yozilgan xabar
 * matni "[tayyorr+] " bilan boshlanadi (smm/src/lib/support.ts). Foydalanuvchiga
 * belgi ko'rsatilmaydi — faqat admin xabar ostida kichik status ko'radi.
 */
export type MessageSource = "tayyorr.uz" | "tayyorr+";

const TAG = /^\[tayyorr\+\]\s*/;

export function splitSource(body: string): { source: MessageSource; body: string } {
  return TAG.test(body) ? { source: "tayyorr+", body: body.replace(TAG, "") } : { source: "tayyorr.uz", body };
}

/** Faqat matn (ro'yxatdagi qisqa ko'rinish va h.k. uchun). */
export function stripSource(body: string): string {
  return body.replace(TAG, "");
}
