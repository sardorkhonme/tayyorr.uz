/**
 * Umumiy kirish (SSO) — barcha *.tayyorr.uz loyihalari uchun bitta "kirish belgisi".
 *
 * Kirish faqat plus.tayyorr.uz da bo'ladi. U yerda kirgan foydalanuvchiga `.tayyorr.uz`
 * domeniga imzolangan cookie (tyr_sso) qo'yiladi — localStorage subdomenlar o'rtasida
 * bo'linmaydi, cookie esa hamma subdomenga ko'rinadi. Boshqa loyihalar (app.tayyorr.uz)
 * shu cookie'ni tekshirib, foydalanuvchini o'zida avtomatik kiritadi.
 *
 * Imzo — HMAC-SHA256 (Web Crypto: middleware/edge va Node'da bir xil ishlaydi).
 * SSO_SECRET barcha loyihalarda bir xil bo'lishi shart. Bu fayl smm/src/lib/sso.ts bilan bir xil.
 */
export const SSO_COOKIE = "tyr_sso";
export const SSO_MAX_AGE = 60 * 60 * 24 * 30; // 30 kun

export function ssoEnabled() {
  return !!process.env.SSO_SECRET;
}

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(process.env.SSO_SECRET ?? ""),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** `<userId>.<exp>.<imzo>` */
export async function signSso(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + SSO_MAX_AGE;
  const body = `${userId}.${exp}`;
  return `${body}.${await hmac(body)}`;
}

/** To'g'ri va muddati o'tmagan bo'lsa — userId, aks holda null. */
export async function verifySso(token: string | undefined | null): Promise<string | null> {
  if (!token || !ssoEnabled()) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!userId || !Number.isFinite(exp) || exp < Date.now() / 1000) return null;
  const expected = await hmac(`${userId}.${expRaw}`);
  if (expected.length !== sig.length) return null;
  let diff = 0;
  for (let i = 0; i < sig.length; i++) diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0 ? userId : null;
}

/** Cookie domeni: prod'da `.tayyorr.uz` (hamma subdomen), localhost'da — berilmaydi. */
export function ssoCookieDomain(host: string | null) {
  const h = (host ?? "").split(":")[0].toLowerCase();
  const base = process.env.SSO_COOKIE_DOMAIN || ".tayyorr.uz";
  return h.endsWith(base.replace(/^\./, "")) ? base : undefined;
}

export function ssoCookieOptions(host: string | null, secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SSO_MAX_AGE,
    domain: ssoCookieDomain(host),
  };
}

/** Belgini o'chirish (chiqishda) — barcha brauzerlarda ishonchli bo'lishi uchun expires ham. */
export function ssoClearOptions(host: string | null, secure: boolean) {
  return { ...ssoCookieOptions(host, secure), maxAge: 0, expires: new Date(0) };
}

/** Faqat o'zimizning domenlarga qaytish (ochiq yo'naltirish bo'lmasin). */
export function safeNext(next: string | null | undefined): string | null {
  if (!next) return null;
  try {
    const u = new URL(next);
    const h = u.hostname.toLowerCase();
    if (h === "tayyorr.uz" || h.endsWith(".tayyorr.uz") || h === "localhost") return u.toString();
  } catch {
    /* noto'g'ri URL */
  }
  return null;
}
