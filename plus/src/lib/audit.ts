import { neon } from "@neondatabase/serverless";

/**
 * Doimiy iz (AuditLog) — admin "Loglar" paneli uchun.
 * - brauzer (components/activity-tracker.tsx): har bir ekran ochilishi (sahifadan sahifaga o'tish ham)
 *   va har bir bosish (tugma, havola, tab ...) → /api/audit → clientEvents();
 * - middleware: amallar (POST/PUT/PATCH/DELETE, mobil ilova ham) — javobdan keyin fonda (waitUntil).
 * Forma ma'lumotlari, parollar va so'rov parametrlari (?…) yozilmaydi — faqat kim, qayerda, nima qildi.
 * Yozib bo'lmasa (baza javob bermasa) — jim o'tib ketadi, sayt ishlayveradi.
 *
 * Bir xil fayl to'rt loyihada: src, plus, smm-app, admin (lib/audit.ts).
 */
export type Site = "app" | "plus" | "smm" | "admin";
export type Actor = "USER" | "ADMIN" | "GUEST";

const BOT = /bot|crawl|spider|slurp|preview|monitor|uptime|headless|lighthouse|curl|wget|python|axios|node-fetch|go-http/i;

// sahifa nomlari (aniq yo'l yoki [id] li shablon)
const PAGES: Record<Site, [RegExp, string][]> = {
  app: [
    [/^\/dashboard$/, "Kabinet"],
    [/^\/orders$/, "Buyurtmalar"],
    [/^\/orders\/new$/, "Yangi buyurtma"],
    [/^\/orders\/[^/]+/, "Buyurtma sahifasi"],
    [/^\/offers$/, "Takliflar"],
    [/^\/messages$/, "Xabarlar"],
    [/^\/messages\/[^/]+/, "Suhbat"],
    [/^\/wallet$/, "Hamyon"],
    [/^\/wallet\/[^/]+/, "Hamyon amali"],
    [/^\/profile/, "Profil"],
    [/^\/referral/, "Taklif havolasi"],
    [/^\/u\/[^/]+/, "Foydalanuvçi profili"],
    [/^\/onboarding/, "Profilni töldiriş"],
  ],
  plus: [
    [/^\/$/, "tayyorr+ boş sahifa"],
    [/^\/login$/, "Kiriş sahifasi"],
    [/^\/register$/, "Röyxatdan ötiş sahifasi"],
    [/^\/onboarding/, "Profilni töldiriş"],
    [/^\/account/, "Akkaunt"],
    [/^\/wallet/, "Hamyon"],
    [/^\/support/, "Support"],
  ],
  smm: [
    [/^\/$/, "SMM xizmatlari"],
    [/^\/chegirmalar/, "Çegirmalar"],
    [/^\/qollanma/, "Qöllanma"],
    [/^\/orders$/, "Buyurtmalarim"],
    [/^\/orders\/[^/]+/, "SMM buyurtma sahifasi"],
    [/^\/wallet/, "Hamyon"],
    [/^\/account/, "Akkaunt"],
    [/^\/support/, "Support"],
  ],
  admin: [
    [/^\/$/, "Boş panel"],
    [/^\/login$/, "Admin kiriş sahifasi"],
    [/^\/stats/, "Statistika"],
    [/^\/logs/, "Loglar"],
    [/^\/maintenance/, "Texnik işlar"],
    [/^\/users\/[^/]+/, "Foydalanuvçi profili"],
    [/^\/users/, "Foydalanuvçilar"],
    [/^\/orders\/[^/]+/, "Buyurtma"],
    [/^\/orders/, "Buyurtmalar"],
    [/^\/smm\/orders\/[^/]+/, "SMM buyurtma"],
    [/^\/smm/, "tayyorr+ / SMM"],
    [/^\/smm-services/, "SMM xizmatlari"],
    [/^\/payments/, "Tölovlar"],
    [/^\/payouts/, "Yeçib oliş"],
    [/^\/messages/, "Xabarlar"],
    [/^\/chats/, "Suhbatlar"],
    [/^\/complaints/, "Şikoyatlar"],
    [/^\/broadcast/, "Ommaviy xabar"],
    [/^\/announcement/, "Eʼlon banneri"],
    [/^\/referrals/, "Taşriflar"],
    [/^\/sources/, "Qayerdan eşitgan"],
    [/^\/landing/, "Sayt kontenti"],
    [/^\/app/, "Mobil ilova"],
  ],
};

// amallar: [usul, yo'l] → o'zbekcha tavsif (birinchi mos kelgani)
const ACTIONS: [RegExp, RegExp, string][] = [
  [/POST/, /^\/login$/, "Kirişga urindi"],
  [/POST/, /^\/register$/, "Röyxatdan ötişga urindi"],
  [/GET|POST/, /^\/logout$/, "Hisobdan çiqdi"],
  [/POST/, /^\/api\/admin\/login/, "Admin panelga kirişga urindi"],
  [/POST/, /^\/api\/admin\/logout/, "Admin paneldan çiqdi"],
  [/./, /^\/api\/admin\/maintenance/, "Texnik işlar sozlamasini özgartirdi"],
  [/./, /^\/api\/admin\/smm-orders\/sync/, "SMM buyurtma holatini yangiladi"],
  [/./, /^\/api\/admin\/smm-settings\/balance/, "Provayder balansini tekşirdi"],
  [/./, /^\/api\/admin\/smm-settings/, "SMM sozlamalarini özgartirdi"],
  [/./, /^\/api\/admin\/smm-adjust/, "SMM narx / çegirmani özgartirdi"],
  [/./, /^\/api\/admin\/users/, "Foydalanuvçi ustida amal bajardi"],
  [/./, /^\/api\/admin\/payouts/, "Yeçib oliş sörovi böyiça qaror qildi"],
  [/./, /^\/api\/admin\/payments/, "Tölov böyiça amal bajardi"],
  [/./, /^\/api\/admin\/broadcast/, "Ommaviy xabar yubordi"],
  [/./, /^\/api\/admin\/announcement/, "Eʼlon bannerini özgartirdi"],
  [/./, /^\/api\/admin\/complaints/, "Şikoyat böyiça amal bajardi"],
  [/./, /^\/api\/admin\/(messages|chats)/, "Çat / xabar böyiça amal bajardi"],
  [/./, /^\/api\/admin\/orders/, "Buyurtma böyiça amal bajardi"],
  [/./, /^\/api\/admin\/contracts/, "Şartnoma böyiça amal bajardi"],
  [/./, /^\/api\/admin\/landing/, "Sayt kontentini özgartirdi"],
  [/./, /^\/api\/admin\/referrals/, "Taşrif havolasini özgartirdi"],
  [/./, /^\/api\/admin\/version/, "Ilova versiyasini özgartirdi"],
  [/./, /^\/api\/admin\/support-profile/, "Support profilini özgartirdi"],
  [/./, /^\/api\/admin\/telegram-test/, "Telegram xabarini sinadi"],
  [/./, /^\/api\/admin\/upload/, "Fayl yukladi"],
  [/POST/, /^\/api\/orders\/[^/]+\/refresh/, "Buyurtma statistikasini yangiladi"],
  [/POST/, /^\/api\/orders$/, "Buyurtma berdi"],
  [/./, /^\/api\/orders/, "Buyurtma böyiça amal bajardi"],
  [/./, /^\/api\/offers/, "Taklif böyiça amal bajardi"],
  [/./, /^\/api\/contracts/, "Şartnoma böyiça amal bajardi"],
  [/./, /^\/api\/(chat|support)/, "Xabar yubordi / çat amali"],
  [/./, /^\/api\/wallet\/topup/, "Hamyonni töldirişni boşladi"],
  [/./, /^\/api\/wallet\/payout/, "Kartaga yeçib olişni söradi"],
  [/./, /^\/api\/wallet/, "Hamyon böyiça amal bajardi"],
  [/./, /^\/api\/upload/, "Fayl yukladi"],
  [/./, /^\/api\/complaints/, "Şikoyat yubordi"],
  [/./, /^\/api\/push/, "Bildirişnomalarni sozladi"],
  [/./, /^\/api\/me\/visit/, "Saytga kirdi (yangi seans)"],
  [/./, /^\/api\/me\/theme/, "Mavzuni özgartirdi"],
  [/./, /^\/api\/me/, "Profil / sozlamalarni özgartirdi"],
  [/./, /^\/api\/onboarding/, "Profilni töldirdi"],
  [/./, /^\/api\/mobile\/auth/, "Mobil ilovaga kirdi"],
  [/./, /^\/api\/mobile/, "Mobil ilovada amal bajardi"],
];

export function pageLabel(site: Site, path: string) {
  return PAGES[site].find(([re]) => re.test(path))?.[1] ?? path;
}

function describe(site: Site, method: string, path: string, serverAction: boolean): { kind: "PAGE" | "ACTION"; summary: string } | null {
  if (method === "GET" && path === "/logout") return { kind: "ACTION", summary: "Hisobdan çiqdi" };
  // sahifa ochilishini brauzerdagi kuzatuvchi yozadi (ichki o'tishlar ham) — bu yerda takrorlanmaydi
  if (method === "GET") return null;
  const hit = ACTIONS.find(([m, re]) => m.test(method) && re.test(path));
  if (hit) return { kind: "ACTION", summary: hit[2] };
  if (serverAction) return { kind: "ACTION", summary: `Forma yubordi: ${pageLabel(site, path)}` };
  return { kind: "ACTION", summary: `Amal: ${method} ${path}` };
}

/** Middleware'dan: yoziladigan so'rov bo'lsa — fonda AuditLog'ga yozadi. */
export function audit(req: Request, waitUntil: (p: Promise<unknown>) => void, site: Site, actor: Actor, userId: string | null) {
  try {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method.toUpperCase();
    const h = req.headers;
    if (method === "HEAD" || method === "OPTIONS") return;
    if (path.startsWith("/_next/") || /\.[a-z0-9]{2,5}$/i.test(path) || path === "/api/audit") return;
    // oldindan yuklash (prefetch) — odam bosmagan
    if (h.get("next-router-prefetch") || /prefetch/i.test(`${h.get("purpose") ?? ""} ${h.get("sec-purpose") ?? ""}`)) return;
    const ua = h.get("user-agent") ?? "";
    if (BOT.test(ua)) return;
    // foydalanuvchisiz API so'rovlari — tashqi xizmatlar (to'lov, cron, Telegram), odam izi emas
    if (path.startsWith("/api/") && actor === "GUEST" && !/^\/api\/(admin\/login|mobile\/auth)/.test(path)) return;
    const d = describe(site, method, path, !!h.get("next-action"));
    if (!d) return;

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) return;
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
    const city = h.get("x-vercel-ip-city");
    const row = {
      id: crypto.randomUUID(),
      actor,
      userId,
      site,
      kind: d.kind,
      method,
      path: path.slice(0, 300),
      summary: d.summary.slice(0, 300),
      ip,
      userAgent: ua.slice(0, 400) || null,
      country: h.get("x-vercel-ip-country"),
      city: city ? decodeURIComponent(city) : null,
    };
    const sql = neon(dbUrl);
    waitUntil(
      sql`INSERT INTO "AuditLog" (id, actor, "userId", site, kind, method, path, summary, ip, "userAgent", country, city)
          VALUES (${row.id}, ${row.actor}, ${row.userId}, ${row.site}, ${row.kind}, ${row.method}, ${row.path}, ${row.summary}, ${row.ip}, ${row.userAgent}, ${row.country}, ${row.city})`.catch(
        () => {},
      ),
    );
  } catch {
    // iz yozilmasa ham sayt ishlayveradi
  }
}

const clean = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * /api/audit — brauzerdagi kuzatuvchi yuborgan izlar: { events: [{ t: "PAGE" | "CLICK", path, label?, href?, at? }] }.
 * Bitta so'rovda ko'pi bilan 60 ta; vaqt — brauzerniki (±1 kun, aks holda server vaqti). Doim 204 qaytaradi.
 */
export async function clientEvents(req: Request, site: Site, actor: Actor, userId: string | null) {
  const ok = new Response(null, { status: 204 });
  const dbUrl = process.env.DATABASE_URL;
  const h = req.headers;
  const ua = h.get("user-agent") ?? "";
  if (!dbUrl || BOT.test(ua)) return ok;
  const body = (await req.json().catch(() => null)) as { events?: unknown } | null;
  const list = (Array.isArray(body?.events) ? body.events.slice(0, 60) : []) as Record<string, unknown>[];
  const city = h.get("x-vercel-ip-city");
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || null;
  const now = Date.now();
  const rows: unknown[][] = [];
  for (const e of list) {
    const path = clean(e?.path, 300);
    if (!path.startsWith("/")) continue;
    // admin "Loglar" bo'limida qilgan ishlari (ochish, filtrlash, bosish) va unga o'tish yozilmaydi
    if (site === "admin" && (/^\/logs(\/|$)/.test(path) || /^\/logs(\/|$)/.test(clean(e.href, 200)))) continue;
    let kind: string;
    let summary: string;
    if (e.t === "PAGE") {
      kind = "PAGE";
      summary = `Sahifani oçdi: ${pageLabel(site, path)}`;
    } else if (e.t === "CLICK") {
      kind = "CLICK";
      const href = clean(e.href, 200);
      summary = `Bosdi: «${clean(e.label, 80) || "nomsiz element"}»${href ? ` → ${href}` : ""}`;
    } else continue;
    const at = typeof e.at === "number" && Math.abs(e.at - now) < 86_400_000 ? new Date(e.at) : new Date(now);
    rows.push([
      crypto.randomUUID(),
      actor,
      userId,
      site,
      kind,
      "GET",
      path,
      summary.slice(0, 300),
      ip,
      ua.slice(0, 400) || null,
      h.get("x-vercel-ip-country"),
      city ? decodeURIComponent(city) : null,
      at,
    ]);
  }
  if (!rows.length) return ok;
  const COLS = 13;
  const values = rows.map((_, i) => "(" + Array.from({ length: COLS }, (_, j) => "$" + (i * COLS + j + 1)).join(", ") + ")").join(", ");
  await neon(dbUrl)
    .query(
      `INSERT INTO "AuditLog" (id, actor, "userId", site, kind, method, path, summary, ip, "userAgent", country, city, "createdAt") VALUES ${values}`,
      rows.flat(),
    )
    .catch(() => {});
  return ok;
}
