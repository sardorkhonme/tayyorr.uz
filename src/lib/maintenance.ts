import { neon } from "@neondatabase/serverless";

/**
 * "Texnik ishlar" rejimi — admin bitta tugma bilan yoqadi (admin.tayyorr.uz → Texnik ishlar).
 * Yoqilganda app / tayyorr+ / SMM saytlari faqat ruxsat ro'yxatidagi foydalanuvchilarga ishlaydi,
 * qolganlarga "texnik ishlar" sahifasi ko'rinadi (landing ishlayveradi, lekin boshqa subdomenga
 * o'tishda shu xabar chiqadi).
 *
 * Middleware (edge) Prisma ishlata olmaydi — holat Neon HTTP orqali o'qiladi va 10 soniya keshlanadi.
 * Foydalanuvchi aniqlanmagan API so'rovlari (Click to'lov xabarlari, cron, Telegram) to'xtamaydi.
 *
 * Bir xil fayl uch loyihada: src, plus, smm-app (lib/maintenance.ts).
 */
export const MAINTENANCE_KEY = "maintenance";

export type Maintenance = { on: boolean; message: string; allow: string[] };

export const DEFAULT_MESSAGE = "Saytda texnik işlar olib borilmoqda. Tez orada qaytamiz!";

export function parseMaintenance(raw: string | null | undefined): Maintenance {
  try {
    const v = raw ? (JSON.parse(raw) as Partial<Maintenance>) : {};
    return {
      on: v.on === true,
      message: typeof v.message === "string" && v.message.trim() ? v.message.trim() : DEFAULT_MESSAGE,
      allow: Array.isArray(v.allow) ? v.allow.filter((x): x is string => typeof x === "string") : [],
    };
  } catch {
    return { on: false, message: DEFAULT_MESSAGE, allow: [] };
  }
}

const OFF: Maintenance = { on: false, message: DEFAULT_MESSAGE, allow: [] };
const TTL = 10_000;
let cache: { at: number; v: Maintenance } | null = null;

export async function getMaintenance(): Promise<Maintenance> {
  if (cache && Date.now() - cache.at < TTL) return cache.v;
  const url = process.env.DATABASE_URL;
  if (!url) return OFF;
  try {
    const sql = neon(url);
    const rows = (await sql`SELECT value FROM "AppSetting" WHERE key = ${MAINTENANCE_KEY} LIMIT 1`) as { value: string }[];
    const v = parseMaintenance(rows[0]?.value);
    cache = { at: Date.now(), v };
    return v;
  } catch {
    // baza javob bermasa — oxirgi ma'lum holat (bo'lmasa — sayt ishlayveradi)
    return cache?.v ?? OFF;
  }
}

/** Mobil ilova Bearer tokenidagi userId — faqat ruxsat ro'yxatini tekshirish uchun (asl tekshiruv route'da). */
export function bearerUserId(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  if (!h.startsWith("Bearer ")) return null;
  try {
    const part = h.slice(7).split(".")[1];
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

type Site = "app" | "plus" | "smm";

const SITE: Record<Site, { name: string; color: string }> = {
  app: { name: "Tayyorr.uz", color: "#6366f1" },
  plus: { name: "tayyorr+", color: "#8b5cf6" },
  smm: { name: "Tayyorr SMM", color: "#d946ef" },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function page(site: Site, message: string) {
  const s = SITE[site];
  const landing = "https://tayyorr.uz";
  return `<!doctype html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Texnik işlar — ${esc(s.name)}</title><meta name="robots" content="noindex">
<style>
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
background:radial-gradient(700px circle at 50% 30%,${s.color}22,transparent 70%),#f7f7fb;color:#18181b}
.c{max-width:440px;width:100%;text-align:center;background:#fff;border:1px solid #ececf2;border-radius:28px;padding:36px 28px;box-shadow:0 24px 60px -24px ${s.color}55}
.m{display:block;width:200px;height:200px;margin:-8px auto 10px;object-fit:contain;animation:f 3.2s ease-in-out infinite}
.g{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:#fff7ed;color:#c2410c;font-size:13px;font-weight:600}
.g i{width:8px;height:8px;border-radius:9px;background:#f97316;animation:p 1.4s infinite}
h1{margin:16px 0 8px;font-size:24px;line-height:1.25}p{margin:0;color:#52525b;line-height:1.6}
a{display:inline-block;margin-top:24px;padding:12px 20px;border-radius:14px;background:${s.color};color:#fff;text-decoration:none;font-weight:600}
@keyframes f{50%{transform:translateY(-7px)}}@keyframes p{50%{opacity:.3}}
@media (prefers-reduced-motion:reduce){.m,.g i{animation:none}}
@media (prefers-color-scheme:dark){body{background:radial-gradient(700px circle at 50% 30%,${s.color}33,transparent 70%),#08080d;color:#f4f4f5}.c{background:#121219;border-color:#ffffff14}p{color:#a1a1aa}.g{background:#f9731622;color:#fdba74}}
</style></head><body><main class="c">
<img class="m" src="/mascot/maintenance.webp" width="200" height="200" alt="" aria-hidden="true">
<span class="g"><i></i>Texnik işlar</span>
<h1>Tez orada qaytamiz</h1>
<p>${esc(message)}</p>
<a href="${esc(landing)}">Boş sahifaga</a>
</main></body></html>`;
}

/**
 * Middleware'dan chaqiriladi: rejim yoqilgan va foydalanuvchi ruxsat ro'yxatida bo'lmasa — javob qaytaradi
 * (sahifa → "texnik ishlar" HTML, API → 503 JSON), aks holda null (so'rov odatdagidek davom etadi).
 * `open` — rejimda ham ochiq qoladigan sahifalar (masalan tayyorr+ dagi /login — ruxsatli odam kira olsin).
 */
export async function maintenanceGate(req: Request, uid: string | null, site: Site, open: RegExp[] = []) {
  const path = new URL(req.url).pathname;
  // statik fayllar, rejim holati (landing so'raydi), kirish/SSO va cron — doim ochiq
  if (
    path.startsWith("/_next/") ||
    /\.[a-z0-9]{2,5}$/i.test(path) ||
    /^\/api\/(auth|sso|cron|public\/maintenance)(\/|$)/.test(path) ||
    open.some((r) => r.test(path))
  ) {
    return null;
  }

  const m = await getMaintenance();
  if (!m.on) return null;
  const id = uid ?? bearerUserId(req);
  if (id && m.allow.includes(id)) return null;

  const headers = { "cache-control": "no-store", "retry-after": "600" };
  if (path.startsWith("/api/")) {
    // foydalanuvchisiz so'rovlar — tashqi xizmatlar (to'lov, Telegram, server-server): to'xtatilmaydi
    if (!id) return null;
    return Response.json({ error: m.message, maintenance: true }, { status: 503, headers });
  }
  return new Response(page(site, m.message), {
    status: 503,
    headers: { ...headers, "content-type": "text/html; charset=utf-8" },
  });
}
