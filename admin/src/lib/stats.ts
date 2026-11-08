import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Admin "Statistika" va "Moliya" sahifalari uchun ma'lumotlar. Hamma vaqtlar Toshkent vaqtida guruhlanadi.
 * Davr (Period): tayyor tanlov (1 / 7 / 30 / 90 kun, 1 yil, hammasi) yoki aniq oraliq (?from=…&to=…).
 * 1 kun — soatma-soat, 92 kungacha — kunma-kun, undan ko'p — oyma-oy. KPI'lar oldingi xuddi shunday oraliq bilan solishtiriladi.
 */
export const PRESETS = [
  { key: "1", label: "1 kun", days: 1 },
  { key: "7", label: "7 kun", days: 7 },
  { key: "30", label: "30 kun", days: 30 },
  { key: "90", label: "90 kun", days: 90 },
  { key: "365", label: "1 yil", days: 365 },
  { key: "all", label: "Hammasi", days: 0 },
] as const;

const TZ = "Asia/Tashkent";
const TZ_OFFSET_MS = 5 * 3600 * 1000; // Toshkent — UTC+5, yozgi vaqt yo'q
const DAY_MS = 86400_000;
const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];

export type Bucket = { key: string; label: string; from: Date };
export type Point = { key: string; values: number[] };
export type Unit = "hour" | "day" | "month";
export type Period = {
  /** tanlangan tugma: "1" | "7" | ... | "all" | "custom" */
  key: string;
  fromDay: string;
  toDay: string;
  from: Date;
  to: Date;
  prevFrom: Date;
  unit: Unit;
  buckets: Bucket[];
  /** "8-noy 2026" yoki "10-okt – 8-noy 2026" */
  label: string;
  /** URL uchun: "r=30" yoki "from=…&to=…" */
  query: string;
};

const isDay = (v: string | undefined): v is string => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
/** "YYYY-MM-DD" (Toshkent) kunining boshi — UTC Date */
const dayStart = (d: string) => new Date(Date.parse(`${d}T00:00:00Z`) - TZ_OFFSET_MS);
const addDays = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
const dayLabel = (d: string, year = false) => {
  const [y, m, dd] = d.split("-").map(Number);
  return `${dd}-${MONTHS[m - 1]}${year ? ` ${y}` : ""}`;
};

/** Toshkent bo'yicha bugungi sana "YYYY-MM-DD". */
export function todayTashkent() {
  return new Date(Date.now() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

function bucketsFor(fromDay: string, toDay: string, unit: Unit): Bucket[] {
  const out: Bucket[] = [];
  if (unit === "hour") {
    const base = dayStart(fromDay).getTime();
    for (let h = 0; h < 24; h++) {
      const key = String(h).padStart(2, "0");
      out.push({ key, label: `${key}:00`, from: new Date(base + h * 3600_000) });
    }
    return out;
  }
  if (unit === "month") {
    let [y, m] = fromDay.split("-").map(Number);
    const [ty, tm] = toDay.split("-").map(Number);
    while (y < ty || (y === ty && m <= tm)) {
      const key = `${y}-${String(m).padStart(2, "0")}`;
      out.push({ key, label: `${MONTHS[m - 1]} ${String(y).slice(2)}`, from: dayStart(`${key}-01`) });
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
    return out;
  }
  for (let d = fromDay; d <= toDay; d = addDays(d, 1)) out.push({ key: d, label: dayLabel(d), from: dayStart(d) });
  return out;
}

/** URL parametrlaridan davr: ?r=7 | ?r=1&from=2026-11-08 | ?from=2026-11-01&to=2026-11-07 | ?r=all */
export async function resolvePeriod(sp: { r?: string; from?: string; to?: string }, fallback = "30"): Promise<Period> {
  const today = todayTashkent();
  let key = sp.r ?? (isDay(sp.from) ? "custom" : fallback);
  let fromDay: string;
  let toDay: string;
  if (key === "1") {
    fromDay = toDay = isDay(sp.from) && sp.from <= today ? sp.from : today;
  } else if (key === "custom") {
    fromDay = isDay(sp.from) ? sp.from : today;
    toDay = isDay(sp.to) ? sp.to : today;
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    if (toDay > today) toDay = today;
    if (fromDay > today) fromDay = today;
    if (fromDay === toDay) key = "1";
  } else if (key === "all") {
    const first = await db.user.findFirst({ orderBy: { createdAt: "asc" }, select: { createdAt: true } });
    fromDay = first ? new Date(first.createdAt.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10) : today;
    toDay = today;
  } else {
    const preset = PRESETS.find((x) => x.key === key && x.days > 1) ?? PRESETS[2];
    key = preset.key;
    toDay = today;
    fromDay = addDays(today, -(preset.days - 1));
  }
  const days = Math.round((Date.parse(toDay) - Date.parse(fromDay)) / DAY_MS) + 1;
  const unit: Unit = days === 1 ? "hour" : days <= 92 ? "day" : "month";
  const from = dayStart(fromDay);
  const to = dayStart(addDays(toDay, 1));
  const sameYear = fromDay.slice(0, 4) === toDay.slice(0, 4);
  return {
    key,
    fromDay,
    toDay,
    from,
    to,
    prevFrom: new Date(from.getTime() - (to.getTime() - from.getTime())),
    unit,
    buckets: bucketsFor(fromDay, toDay, unit),
    label: days === 1 ? dayLabel(fromDay, true) : `${dayLabel(fromDay, !sameYear)} – ${dayLabel(toDay, true)}`,
    query: key === "1" ? `r=1&from=${fromDay}` : key === "custom" ? `from=${fromDay}&to=${toDay}` : `r=${key}`,
  };
}

/** to_char formati bucket kalitiga mos */
export const bucketFmt = (unit: Unit) => Prisma.raw(unit === "month" ? `'YYYY-MM'` : unit === "hour" ? `'HH24'` : `'YYYY-MM-DD'`);

export const local = (col: string) => Prisma.raw(`(("${col}" AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')`);

export type Row = { k: string } & Record<string, unknown>;

/** Bucket bo'yicha guruhlangan qatorlarni to'liq (bo'shlari 0) seriyaga aylantiradi. */
export function fill(bs: Bucket[], rows: Row[], cols: string[]): Point[] {
  const m = new Map(rows.map((r) => [r.k, r]));
  return bs.map((b) => ({ key: b.key, values: cols.map((c) => Number(m.get(b.key)?.[c] ?? 0)) }));
}

export async function loadStats(period: Period) {
  const { unit, from, to, prevFrom } = period;
  const bs = period.buckets;
  const fmt = bucketFmt(unit);
  const k = (col = "createdAt") => Prisma.sql`to_char(${local(col)}, ${fmt})`;

  const [
    users,
    visits,
    money,
    smm,
    orders,
    messages,
    kpi,
    orderStatus,
    orderType,
    smmPlatform,
    smmStatus,
    topServices,
    methods,
    heat,
    roles,
  ] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n FROM "User"
      WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS u FROM "SiteVisit"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP'), 0)::bigint AS topup,
        COALESCE(SUM(amount) FILTER (WHERE type = 'PAYOUT'), 0)::bigint AS payout,
        COALESCE(SUM(amount) FILTER (WHERE type = 'COMMISSION'), 0)::bigint AS commission
      FROM "WalletTransaction"
      WHERE status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n,
        COALESCE(SUM(charge - COALESCE("refundAmount", 0)) FILTER (WHERE status <> 'FAILED'), 0)::bigint AS net
      FROM "SmmOrder" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n FROM "Message"
      WHERE system = false AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    // KPI: joriy va oldingi davr
    db.$queryRaw<Record<string, bigint | number>[]>`
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS users,
        (SELECT COUNT(*) FROM "User" WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS users_p,
        (SELECT COUNT(DISTINCT "userId") FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}) AS active,
        (SELECT COUNT(DISTINCT "userId") FROM "SiteVisit" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS active_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS topup,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS topup_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'COMMISSION' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS commission,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'COMMISSION' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS commission_p,
        (SELECT COALESCE(SUM(charge - COALESCE("refundAmount", 0)), 0) FROM "SmmOrder" WHERE status <> 'FAILED' AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS smm,
        (SELECT COALESCE(SUM(charge - COALESCE("refundAmount", 0)), 0) FROM "SmmOrder" WHERE status <> 'FAILED' AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS smm_p,
        (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}) AS orders,
        (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS orders_p,
        (SELECT COUNT(*) FROM "SmmOrder" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}) AS smm_orders,
        (SELECT COUNT(*) FROM "SmmOrder" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS smm_orders_p,
        (SELECT COUNT(*) FROM "Message" WHERE system = false AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS messages,
        (SELECT COUNT(*) FROM "Message" WHERE system = false AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS messages_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'PAYOUT' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to}) AS payout,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'PAYOUT' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS payout_p`,
    db.$queryRaw<Row[]>`SELECT status::text AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT type::text AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`
      SELECT s.platform AS k, COUNT(*)::int AS n, COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o."createdAt" >= ${from} AND o."createdAt" < ${to} AND o.status <> 'FAILED' GROUP BY 1 ORDER BY 3 DESC`,
    db.$queryRaw<Row[]>`SELECT status AS k, COUNT(*)::int AS n FROM "SmmOrder" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`
      SELECT s.name AS k, s.platform AS p, COUNT(*)::int AS n, COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o."createdAt" >= ${from} AND o."createdAt" < ${to} AND o.status <> 'FAILED' GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 8`,
    db.$queryRaw<Row[]>`
      SELECT method AS k, COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::bigint AS sum FROM "WalletTransaction"
      WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1 ORDER BY 3 DESC`,
    // hafta kuni (1 = dushanba) × soat — foydalanuvchi amallari va tashriflar
    db.$queryRaw<{ d: number; h: number; n: number }[]>`
      SELECT EXTRACT(ISODOW FROM t)::int AS d, EXTRACT(HOUR FROM t)::int AS h, COUNT(*)::int AS n FROM (
        SELECT ${local("createdAt")} AS t FROM "ActivityLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION ALL
        SELECT ${local("createdAt")} AS t FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      ) x GROUP BY 1, 2`,
    db.$queryRaw<Row[]>`
      SELECT COALESCE(role::text, 'NONE') AS k, COUNT(*)::int AS n FROM "User"
      WHERE "isSupport" = false AND "isPlatform" = false GROUP BY 1 ORDER BY 2 DESC`,
  ]);

  const K = kpi[0];
  const pair = (a: string) => ({ cur: Number(K[a] ?? 0), prev: Number(K[`${a}_p`] ?? 0) });
  const grid = Array.from({ length: 7 }, () => Array(24).fill(0) as number[]);
  for (const c of heat) grid[c.d - 1][c.h] = c.n;
  const rows = (r: Row[]) => r.map((x) => ({ key: String(x.k), n: Number(x.n ?? 0), net: Number(x.net ?? 0), sum: Number(x.sum ?? 0) }));

  return {
    period,
    unit,
    labels: bs.map((b) => b.label),
    kpi: {
      users: pair("users"),
      active: pair("active"),
      topup: pair("topup"),
      commission: pair("commission"),
      smm: pair("smm"),
      orders: pair("orders"),
      smmOrders: pair("smm_orders"),
      messages: pair("messages"),
      payout: pair("payout"),
    },
    series: {
      users: fill(bs, users, ["n"]),
      visits: fill(bs, visits, ["n", "u"]),
      money: fill(bs, money, ["topup", "payout", "commission"]),
      smm: fill(bs, smm, ["n", "net"]),
      orders: fill(bs, orders, ["n"]),
      messages: fill(bs, messages, ["n"]),
    },
    orderStatus: rows(orderStatus),
    orderType: rows(orderType),
    smmPlatform: rows(smmPlatform),
    smmStatus: rows(smmStatus),
    topServices: topServices.map((r) => ({ name: String(r.k), platform: String(r.p), n: Number(r.n), net: Number(r.net) })),
    methods: rows(methods),
    heat: grid,
    roles: rows(roles),
  };
}

export type Stats = Awaited<ReturnType<typeof loadStats>>;


/**
 * Tanlangan kunning soatma-soat faolligi (Toshkent vaqti): ekran ochish, bosish, amallar
 * (AuditLog + eski ActivityLog) va har soatda nechta alohida odam (foydalanuvchi yoki mehmon — IP bo'yicha).
 */
export async function loadDay(dayRaw: string | undefined) {
  const today = todayTashkent();
  const day = dayRaw && /^\d{4}-\d{2}-\d{2}$/.test(dayRaw) && dayRaw <= today ? dayRaw : today;
  const [y, m, d] = day.split("-").map(Number);
  const from = new Date(Date.UTC(y, m - 1, d) - TZ_OFFSET_MS);
  const to = new Date(from.getTime() + 86400_000);
  const h = (col: string) => Prisma.sql`EXTRACT(HOUR FROM ${local(col)})::int`;

  const [audit, activity, visits] = await Promise.all([
    db.$queryRaw<{ h: number; page: number; click: number; action: number; people: number; users: number }[]>`
      SELECT ${h("createdAt")} AS h,
        COUNT(*) FILTER (WHERE kind = 'PAGE')::int AS page,
        COUNT(*) FILTER (WHERE kind = 'CLICK')::int AS click,
        COUNT(*) FILTER (WHERE kind = 'ACTION')::int AS action,
        COUNT(DISTINCT COALESCE("userId", CASE WHEN actor = 'ADMIN' THEN 'admin' END, ip))::int AS people,
        COUNT(DISTINCT "userId")::int AS users
      FROM "AuditLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "createdAt" < ${to} GROUP BY 1`.catch(() => []),
    db.$queryRaw<{ h: number; n: number }[]>`
      SELECT ${h("createdAt")} AS h, COUNT(*)::int AS n FROM "ActivityLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<{ h: number; n: number; u: number }[]>`
      SELECT ${h("createdAt")} AS h, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS u FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "createdAt" < ${to} GROUP BY 1`,
  ]);

  const hours = Array.from({ length: 24 }, (_, hr) => {
    const a = audit.find((r) => r.h === hr);
    const act = activity.find((r) => r.h === hr)?.n ?? 0;
    const v = visits.find((r) => r.h === hr);
    return {
      label: `${String(hr).padStart(2, "0")}:00`,
      page: a?.page ?? 0,
      click: a?.click ?? 0,
      // server amallari (AuditLog) yo'q eski kunlarda — ActivityLog dan
      action: Math.max(a?.action ?? 0, act),
      // AuditLog bo'lmagan eski kunlarda — tashriflardagi alohida foydalanuvchilar
      people: Math.max(a?.people ?? 0, v?.u ?? 0),
      visits: v?.n ?? 0,
    };
  });
  const total = hours.reduce((s, x) => s + x.page + x.click + x.action, 0);
  const peak = hours.reduce((best, x, i) => (x.page + x.click + x.action > best.v ? { i, v: x.page + x.click + x.action } : best), { i: -1, v: 0 });
  const [people] = await Promise.all([
    db.$queryRaw<{ n: number }[]>`
      SELECT COUNT(DISTINCT p)::int AS n FROM (
        SELECT COALESCE("userId", CASE WHEN actor = 'ADMIN' THEN 'admin' END, ip) AS p FROM "AuditLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "createdAt" < ${to}
        UNION SELECT "userId" FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} AND "createdAt" < ${to}
      ) x WHERE p IS NOT NULL`.catch(() => [{ n: 0 }]),
  ]);

  return { day, today, hours, total, peak: peak.i, people: people[0]?.n ?? 0 };
}
