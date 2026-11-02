/** Landingdagi tashqi havolalar — har bir xizmat o'z subdomenida. */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tayyorr.uz";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz";
export const PLUS_URL = process.env.NEXT_PUBLIC_TAYYORR_PLUS_URL || "https://plus.tayyorr.uz";

/** Kirish va ro'yxatdan o'tish — faqat tayyorr+ orqali (bitta hisob, hamma platforma). */
export const LOGIN_URL = `${PLUS_URL}/login`;
export const START_URL = `${PLUS_URL}/register`;

export const TELEGRAM_URL = "https://t.me/tayyorruz";
export const INSTAGRAM_URL = "https://instagram.com/tayyorr.uz";
