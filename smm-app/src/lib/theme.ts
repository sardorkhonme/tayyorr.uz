/**
 * Yorug'/qorong'i mavzu — tayyorr+, app.tayyorr.uz va Tayyorr SMM da BITTA tanlov.
 *
 *  · cookie `tyr_theme` — `.tayyorr.uz` domeniga (SSO cookie'si bilan bir xil mantiq), shuning uçun
 *    bir saytda tanlansa, qolgan ikkalasi ham şu rejimda oçiladi; localhost'da domen berilmaydi;
 *  · hisobga kirgan bölsa — bazadagi `user.theme` ustuvor (mobil ilova ham şuni işlatadi),
 *    özgarganda `/api/me/theme` orqali saqlanadi.
 * Bu fayl plus/src/lib/theme.ts bilan bir xil (smm-app va plus — `html.dark` klassi).
 */
export const THEME_COOKIE = "tyr_theme";
export const THEME_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemeMode = "light" | "dark";

export const THEME_BG: Record<ThemeMode, string> = { light: "#f5f5f9", dark: "#0c0c11" };

export function asTheme(v: unknown): ThemeMode | null {
  return v === "light" || v === "dark" ? v : null;
}

/** Bazadagi tanlov (kirgan bölsa) > umumiy cookie > null (qurilma mavzusi). */
export function resolveTheme(dbTheme: unknown, cookieTheme: unknown): ThemeMode | null {
  return asTheme(dbTheme) ?? asTheme(cookieTheme);
}

const SHARED_DOMAIN = (process.env.NEXT_PUBLIC_SSO_COOKIE_DOMAIN || ".tayyorr.uz").replace(/^\.?/, ".");

/**
 * Birinçi çiziliştan oldin işlaydigan skript (miltillamasin):
 *  · server aniqlagan rejim (`server`) yoki cookie — `html.dark`; ikkalasi ham bölmasa — qurilma mavzusi;
 *  · tanlov bor bölsa — cookie `.tayyorr.uz` ga qayta yoziladi (eski, faqat şu subdomendagi cookie öçiriladi —
 *    aks holda ikkalasi yuborilib, qaysi biri öqilişi noaniq).
 */
export function themeInitScript(server: ThemeMode | null) {
  return `(function(){try{var d=document.documentElement,c=document.cookie.match(/(?:^|; )${THEME_COOKIE}=(light|dark)/),t=${JSON.stringify(
    server,
  )}||(c&&c[1]);if(!t){d.classList.toggle('dark',matchMedia('(prefers-color-scheme: dark)').matches);return;}d.classList.toggle('dark',t==='dark');var b=${JSON.stringify(
    SHARED_DOMAIN.slice(1),
  )},h=location.hostname,s=h===b||h.slice(-b.length-1)==='.'+b;if(s)document.cookie='${THEME_COOKIE}=; path=/; max-age=0';document.cookie='${THEME_COOKIE}='+t+'; path=/; max-age=${THEME_MAX_AGE}; samesite=lax'+(s?'; domain=.'+b:'');}catch(e){}})();`;
}

/** Brauzerda: umumiy cookie'ni yozadi (tayyorr.uz subdomenlarida — `.tayyorr.uz` ga). */
export function writeThemeCookie(mode: ThemeMode) {
  const base = SHARED_DOMAIN.slice(1);
  const h = location.hostname;
  const shared = h === base || h.endsWith(`.${base}`);
  if (shared) document.cookie = `${THEME_COOKIE}=; path=/; max-age=0`;
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=${THEME_MAX_AGE}; samesite=lax${shared ? `; domain=.${base}` : ""}`;
}

/** Brauzerda: rejimni qöllaydi, cookie'ga yozadi va (kirgan bölsa) bazaga saqlaydi. */
export function applyTheme(mode: ThemeMode, { save = true }: { save?: boolean } = {}) {
  document.documentElement.classList.toggle("dark", mode === "dark");
  writeThemeCookie(mode);
  document.querySelectorAll('meta[name="theme-color"]').forEach((el) => el.setAttribute("content", THEME_BG[mode]));
  if (save) {
    fetch("/api/me/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme: mode }),
    }).catch(() => {});
  }
}
