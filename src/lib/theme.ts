/**
 * Yorug'/qorong'i mavzu — app.tayyorr.uz, tayyorr+ va Tayyorr SMM da BITTA tanlov.
 *
 *  · cookie `tyr_theme` — `.tayyorr.uz` domeniga (SSO cookie'si bilan bir xil mantiq), shuning uçun
 *    bir saytda tanlansa, qolgan ikkalasi ham şu rejimda oçiladi; localhost'da domen berilmaydi;
 *  · hisobga kirgan bölsa — bazadagi `user.theme` ustuvor (ThemeSync), özgarganda `/api/me/theme`.
 * app.tayyorr.uz — `html.light` klassi (asosiy rejim qorong'i); plus va smm-app — `html.dark`.
 */
export const THEME_COOKIE = "tyr_theme";
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemeMode = "light" | "dark";

const SHARED_BASE = (process.env.NEXT_PUBLIC_SSO_COOKIE_DOMAIN || ".tayyorr.uz").replace(/^\./, "");

/**
 * Head skripti uçun: tanlov bor bölsa (bazadagi `server` yoki cookie) — cookie `.tayyorr.uz` ga qayta yoziladi
 * (eski, faqat şu subdomendagi cookie öçiriladi — aks holda ikkalasi yuborilib, qaysi biri öqilişi noaniq).
 */
export function themeCookieMigrateJs(server: ThemeMode | null) {
  return `var tc=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/),tv=${JSON.stringify(
    server,
  )}||(tc&&tc[1]);if(tv){var tb=${JSON.stringify(
    SHARED_BASE,
  )},th=location.hostname,ts=th===tb||th.slice(-tb.length-1)==='.'+tb;if(ts)document.cookie='${THEME_COOKIE}=; path=/; max-age=0';document.cookie='${THEME_COOKIE}='+tv+'; path=/; max-age=${THEME_MAX_AGE}; samesite=lax'+(ts?'; domain=.'+tb:'');}`;
}

/** Brauzerda: umumiy cookie'ni yozadi (tayyorr.uz subdomenlarida — `.tayyorr.uz` ga). */
export function writeThemeCookie(mode: ThemeMode) {
  const h = location.hostname;
  const shared = h === SHARED_BASE || h.endsWith(`.${SHARED_BASE}`);
  if (shared) document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax${
    shared ? `; domain=.${SHARED_BASE}` : ""
  }`;
}
