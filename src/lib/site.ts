/**
 * Domenlar: bitta kod — ikki Vercel loyihasi.
 *   tayyorr.uz      — faqat landing (+ /xizmatlar, /terms, /privacy) va API (mobil ilova, Click)
 *   app.tayyorr.uz  — kabinet: buyurtmalar, xabarlar, hamyon, admin panel
 * Rol SITE_ROLE (landing | app) bilan beriladi. Landing rejimi faqat SITE_ROLE=landing
 * qo'yilganda yoqiladi (app.tayyorr.uz tayyor bo'lmaguncha tayyorr.uz hammasini o'zi ko'rsatadi);
 * app rejimi domen nomidan ham aniqlanadi. localhost / preview — hammasi bitta joyda ("all").
 */
export const LANDING_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
/** NEXT_PUBLIC_APP_URL qo'yilmaguncha kabinet havolalari tayyorr.uz ning o'ziga boradi. */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || LANDING_URL;
export const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

export type SiteRole = "landing" | "app" | "all";

export function siteRole(host: string | null): SiteRole {
  const env = process.env.SITE_ROLE;
  // app manzili berilmagan bo'lsa landing rejimi yoqilmaydi (aks holda o'ziga yo'naltirib qoladi)
  if (env === "landing") return APP_URL !== LANDING_URL ? "landing" : "all";
  if (env === "app") return "app";
  const h = (host ?? "").toLowerCase().split(":")[0];
  if (APP_URL !== LANDING_URL && h === hostOf(APP_URL)) return "app";
  return "all";
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Landingda qoladigan sahifalar (qolganlari app.tayyorr.uz ga yo'naltiriladi). */
export function isLandingPath(path: string) {
  return (
    path === "/" ||
    path === "/terms" ||
    path === "/privacy" ||
    path === "/xizmatlar" ||
    path.startsWith("/xizmatlar/")
  );
}

/** Ikkala domenda ham ishlaydigan yo'llar: API va statik/SEO fayllar. */
export function isSharedPath(path: string) {
  return path.startsWith("/api/") || path === "/api" || /\.[a-z0-9]+$/i.test(path);
}

/** Kabinetdagi sahifaga to'liq havola (Telegram, push, email uchun). */
export function appUrl(path: string) {
  return `${APP_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}
