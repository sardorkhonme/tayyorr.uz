import { neon } from "@neondatabase/serverless";

/**
 * Android ilovasining yangilanishi (admin.tayyorr.uz → Mobil ilova → "Ilova yangilanishi").
 *
 * Versiya ikki raqamli: "1.1", "1.2" … — birinchisi katta (yiliga bir marta), ikkinchisi kichik yangilanish.
 * Ilovaning build raqami shundan hisoblanadi: major*100 + minor ("1.1" → 101, "2.0" → 200) —
 * mobile/pubspec.yaml dagi `version: 1.1.0+101` bilan bir xil.
 *
 * Ilova har so'rovda `X-App-Build` sarlavhasini yuboradi. Admin "majburiy versiya"ni belgilasa, undan eski
 * ilovalar (sarlavhasiz eski versiyalar ham) /api/mobile/* da 426 oladi — ilova "Yangilang" oynasini ko'rsatadi,
 * eski versiya esa xato matnini. Bu so'rovlar bazaga tegmay qaytadi (CPU tejaladi).
 *
 * Middleware (edge) Prisma ishlata olmaydi — Neon HTTP orqali o'qiladi va 30 soniya keshlanadi.
 * Admin tomoni: admin/src/lib/mobile-update.ts (bir xil kalit va format).
 */
export const MOBILE_UPDATE_KEY = "mobileUpdate";
export const DEFAULT_APK_KEY = "app/tayyorr.apk";

export type MobileUpdate = {
  /** majburiy minimal versiya ("1.1"); bo'sh — tekshirilmaydi */
  min: string;
  /** yuklangan eng yangi APK versiyasi */
  latest: string;
  /** R2 (ochiq bucket) dagi APK kaliti */
  apkKey: string;
  /** "Nima yangi" — ilovadagi oynada ko'rsatiladi */
  notes: string;
};

/** "1.1" → 101; noto'g'ri bo'lsa 0. */
export function versionCode(v: string | null | undefined): number {
  const m = /^(\d{1,3})\.(\d{1,2})$/.exec((v ?? "").trim());
  return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
}

export function parseMobileUpdate(raw: string | null | undefined): MobileUpdate {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<MobileUpdate>) : {};
    const s = (x: unknown) => (typeof x === "string" ? x.trim() : "");
    return {
      min: versionCode(s(v.min)) ? s(v.min) : "",
      latest: versionCode(s(v.latest)) ? s(v.latest) : "",
      apkKey: s(v.apkKey) || DEFAULT_APK_KEY,
      notes: s(v.notes).slice(0, 1000),
    };
  } catch {
    return { min: "", latest: "", apkKey: DEFAULT_APK_KEY, notes: "" };
  }
}

const OFF: MobileUpdate = { min: "", latest: "", apkKey: DEFAULT_APK_KEY, notes: "" };
const TTL = 30_000;
let cache: { at: number; v: MobileUpdate } | null = null;

export async function getMobileUpdate(): Promise<MobileUpdate> {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  const url = process.env.DATABASE_URL;
  if (!url) return OFF;
  try {
    const sql = neon(url);
    const rows = (await sql`SELECT value FROM "AppSetting" WHERE key = ${MOBILE_UPDATE_KEY} LIMIT 1`) as { value: string }[];
    const v = parseMobileUpdate(rows[0]?.value);
    cache = { at: Date.now(), v };
    return v;
  } catch {
    return cache?.v ?? OFF;
  }
}

/** APK ning ochiq manzili (yangilanishda keshdan eski fayl kelmasligi uchun versiya bilan). */
export function apkUrl(u: MobileUpdate): string {
  const base = (process.env.R2_PUBLIC_URL || "").replace(/\/$/, "");
  const q = u.latest ? `?v=${versionCode(u.latest)}` : "";
  return `${base}/${u.apkKey}${q}`;
}

/** Ilovadan kelgan build raqami (sarlavha bo'lmasa — 0, ya'ni eski ilova). */
export function requestBuild(req: Request): number {
  const n = Number(req.headers.get("x-app-build") ?? "");
  return Number.isInteger(n) && n > 0 ? n : 0;
}

export const UPDATE_REQUIRED_TEXT =
  "Ilovaning yangi versiyasi çiqdi. Davom etiş uçun ilovani yangilang — tayyorr.uz saytidan yuklab olişingiz mumkin.";
