/** Yorug'/qorong'i mavzu — tanlov cookie'da (server birinçi çiziliştayoq tögri klassni qöyadi). */
export const THEME_COOKIE = "tyr_theme";

export type ThemeMode = "light" | "dark";

/** Tanlov qilinmagan bölsa — qurilma mavzusi. */
export const THEME_INIT_SCRIPT = `(function(){try{if(window.matchMedia('(prefers-color-scheme: dark)').matches)document.documentElement.classList.add('dark');}catch(e){}})();`;
