/**
 * Xabar qaysi platformaga tegishli — matn boshidagi belgi (foydalanuvchiga ko'rsatilmaydi):
 *   "[tayyorr+]" — faqat tayyorr+ (plus.tayyorr.uz) da
 *   "[smm]"      — faqat Tayyorr SMM (smm.tayyorr.uz) da: SMM buyurtmalari, u yerdan yozilganlar
 *   "[all]"      — barcha platformalarda: hisob / pul haqida, admin tanlasa
 *   belgisiz     — faqat tayyorr.uz da
 * Admin har bir xabar ostida kichik status ko'radi. Boshqa tomonlar: plus/src/lib/support.ts,
 * smm-app/src/lib/support.ts.
 */
export type MessageSource = "tayyorr.uz" | "tayyorr+" | "smm" | "ikkalasi";

export const PLUS_TAG = "[tayyorr+]";
export const SMM_TAG = "[smm]";
export const ALL_TAG = "[all]";
const TAG = /^\[(tayyorr\+|smm|all)\]\s*/;

export function splitSource(body: string): { source: MessageSource; body: string } {
  const m = TAG.exec(body);
  if (!m) return { source: "tayyorr.uz", body };
  const source: MessageSource = m[1] === "all" ? "ikkalasi" : m[1] === "smm" ? "smm" : "tayyorr+";
  return { source, body: body.slice(m[0].length) };
}

/** Faqat matn (ro'yxatdagi qisqa ko'rinish va h.k. uchun). */
export function stripSource(body: string): string {
  return body.replace(TAG, "");
}

/** Matnga platforma belgisini qo'yadi (admin tanlovi, ommaviy xabar va h.k.). */
export function withSource(body: string, source: MessageSource): string {
  const clean = stripSource(body);
  if (source === "tayyorr+") return `${PLUS_TAG} ${clean}`;
  if (source === "smm") return `${SMM_TAG} ${clean}`;
  if (source === "ikkalasi") return `${ALL_TAG} ${clean}`;
  return clean;
}

/** tayyorr.uz da ko'rinadigan xabarlar (Prisma `where`): tayyorr+ va SMM ga xoslari yashirin. */
export const VISIBLE_ON_UZ = {
  NOT: [{ body: { startsWith: PLUS_TAG } }, { body: { startsWith: SMM_TAG } }],
};

/** Xabar faqat boshqa platformaga tegishlimi (tayyorr.uz da ko'rinmaydi). */
export const isForeignSource = (source?: MessageSource) => source === "tayyorr+" || source === "smm";

export const SOURCE_LABELS: Record<MessageSource, string> = {
  "tayyorr.uz": "tayyorr.uz",
  "tayyorr+": "tayyorr+",
  smm: "Tayyorr SMM",
  ikkalasi: "Hammasi",
};

export const SOURCE_OPTIONS: { value: MessageSource; label: string }[] = [
  { value: "tayyorr.uz", label: "tayyorr.uz" },
  { value: "tayyorr+", label: "tayyorr+" },
  { value: "smm", label: "Tayyorr SMM" },
  { value: "ikkalasi", label: "Hammasi" },
];
