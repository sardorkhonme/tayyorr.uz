/**
 * Domenlar — har biri alohida Vercel loyihasi:
 *   tayyorr.uz       — landing (landing/ papkasi); /api ni shu loyihaga proksi qiladi
 *   app.tayyorr.uz   — kabinet: ilmiy ishlar, xabarlar, hamyon (shu loyiha) + barcha API
 *   plus.tayyorr.uz  — tayyorr+ (smm/): yagona kirish nuqtasi va xizmatlar paneli
 *   admin.tayyorr.uz — admin panel (admin/)
 */
export const LANDING_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
/** NEXT_PUBLIC_APP_URL qo'yilmaguncha kabinet havolalari tayyorr.uz ga (u app ga yo'naltiradi). */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || LANDING_URL;
export const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";
/** Admin panel — alohida loyiha. Berilmaguncha eski joyi (/sardorxon/admin) ishlaydi. */
export const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL || "";

const ADMIN_PREFIX = "/sardorxon/admin";

/**
 * Xabarnomalar uchun to'liq havola: admin sahifalari (/sardorxon/admin/...) — admin.tayyorr.uz
 * ga (prefikssiz), qolgani kabinetga (app.tayyorr.uz).
 */
export function absoluteUrl(path: string) {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (ADMIN_URL && (p === ADMIN_PREFIX || p.startsWith(`${ADMIN_PREFIX}/`) || p.startsWith(`${ADMIN_PREFIX}?`))) {
    return `${ADMIN_URL.replace(/\/+$/, "")}${p.slice(ADMIN_PREFIX.length) || "/"}`;
  }
  return `${APP_URL.replace(/\/+$/, "")}${p}`;
}
