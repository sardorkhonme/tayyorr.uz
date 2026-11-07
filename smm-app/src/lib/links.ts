/**
 * Foydalanuvchi kiritgan havolani provayder tushunadigan to'liq havolaga keltiradi.
 * "@username" — platformaga qarab profil havolasi bo'ladi (provayder "@..." ni to'g'ri tushunmaydi:
 * buyurtma qisman bajarilib qolgan); "instagram.com/..." — boshiga https:// qo'shiladi.
 * Brauzerda (buyurtma oynasi — "Yuboriladi: ...") ham, serverda (placeOrder) ham ishlatiladi.
 */
const PROFILE: Record<string, (u: string) => string> = {
  instagram: (u) => `https://www.instagram.com/${u}/`,
  telegram: (u) => `https://t.me/${u}`,
  tiktok: (u) => `https://www.tiktok.com/@${u}`,
  youtube: (u) => `https://www.youtube.com/@${u}`,
  facebook: (u) => `https://www.facebook.com/${u}`,
  twitter: (u) => `https://x.com/${u}`,
};

/** Profil (username) emas, aniq post/video havolasi kerak bo'lgan xizmat turlari. */
const POST_KINDS = ["likes", "views", "comments", "shares"];

export type LinkResult = { ok: true; url: string } | { ok: false; error: string };

export function normalizeLink(raw: string, platform: string, kind: string, serviceName = ""): LinkResult {
  const v = raw.trim();
  if (!v) return { ok: false, error: "Havolani kiriting" };

  if (/^https?:\/\/\S+$/i.test(v)) return { ok: true, url: v };

  // "instagram.com/user", "www.tiktok.com/@user/video/1", "t.me/kanal"
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}\/\S*$/i.test(v)) return { ok: true, url: `https://${v}` };

  const m = /^@([A-Za-z0-9._-]{1,64})$/.exec(v);
  if (m) {
    const toProfile = PROFILE[platform];
    if (!toProfile) return { ok: false, error: "Töliq havolani kiriting (https:// bilan)" };
    // "Last 5 Post" kabi xizmatlar profil havolasini oladi
    if (POST_KINDS.includes(kind) && !/last\s*\d*\s*posts?|auto|profile/i.test(serviceName)) {
      return { ok: false, error: "Bu xizmat uçun @username emas, post yoki video havolasi kerak" };
    }
    return { ok: true, url: toProfile(m[1]) };
  }

  return { ok: false, error: "Havola https:// yoki @ bilan boşlansin" };
}
