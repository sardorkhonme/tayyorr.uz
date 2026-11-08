import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

/**
 * Admin "Statistika" sahifasi uchun ma'lumotlar. Hamma vaqtlar Toshkent vaqtida guruhlanadi.
 * Davr: 7 / 30 / 90 kun (kunlik) yoki 365 kun (oylik). KPI'lar oldingi xuddi shunday davr bilan solishtiriladi.
 */
export const RANGES = [
  { key: "7", label: "7 kun", days: 7 },
  { key: "30", label: "30 kun", days: 30 },
  { key: "90", label: "90 kun", days: 90 },
  { key: "365", label: "1 yil", days: 365 },
] as const;
export type RangeKey = (typeof RANGES)[number]["key"];

const TZ = "Asia/Tashkent";
const TZ_OFFSET_MS = 5 * 3600 * 1000; // Toshkent — UTC+5, yozgi vaqt yo'q

export type Bucket = { key: string; label: string; from: Date };
export type Point = { key: string; values: number[] };

/** Toshkent vaqtidagi kun/oy boshlari. key — "2026-11-07" yoki "2026-11". */
export function buckets(days: number, unit: "day" | "month"): Bucket[] {
  const nowLocal = new Date(Date.now() + TZ_OFFSET_MS);
  const out: Bucket[] = [];
  const MONTHS = ["yan", "fev", "mar", "apr", "may", "iyn", "iyl", "avg", "sen", "okt", "noy", "dek"];
  if (unit === "month") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth() - i, 1));
      out.push({
        key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
        label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        from: new Date(d.getTime() - TZ_OFFSET_MS),
      });
    }
    return out;
  }
  const today = Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth(), nowLocal.getUTCDate());
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today - i * 86400_000);
    out.push({
      key: d.toISOString().slice(0, 10),
      label: `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`,
      from: new Date(d.getTime() - TZ_OFFSET_MS),
    });
  }
  return out;
}

export const local = (col: string) => Prisma.raw(`(("${col}" AT TIME ZONE 'UTC') AT TIME ZONE '${TZ}')`);

export type Row = { k: string } & Record<string, unknown>;

/** Bucket bo'yicha guruhlangan qatorlarni to'liq (bo'shlari 0) seriyaga aylantiradi. */
export function fill(bs: Bucket[], rows: Row[], cols: string[]): Point[] {
  const m = new Map(rows.map((r) => [r.k, r]));
  return bs.map((b) => ({ key: b.key, values: cols.map((c) => Number(m.get(b.key)?.[c] ?? 0)) }));
}

export async function loadStats(rangeKey: string) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const unit = range.days > 90 ? "month" : "day";
  const bs = buckets(range.days, unit);
  const from = bs[0].from;
  const prevFrom = new Date(from.getTime() - (Date.now() - from.getTime()));
  const fmt = Prisma.raw(unit === "month" ? `'YYYY-MM'` : `'YYYY-MM-DD'`);
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
      WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS u FROM "SiteVisit"
      WHERE "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP'), 0)::bigint AS topup,
        COALESCE(SUM(amount) FILTER (WHERE type = 'PAYOUT'), 0)::bigint AS payout,
        COALESCE(SUM(amount) FILTER (WHERE type = 'COMMISSION'), 0)::bigint AS commission
      FROM "WalletTransaction"
      WHERE status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n,
        COALESCE(SUM(charge - COALESCE("refundAmount", 0)) FILTER (WHERE status <> 'FAILED'), 0)::bigint AS net
      FROM "SmmOrder" WHERE "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k()} AS k, COUNT(*)::int AS n FROM "Message"
      WHERE system = false AND "createdAt" >= ${from} GROUP BY 1`,
    // KPI: joriy va oldingi davr
    db.$queryRaw<Record<string, bigint | number>[]>`
      SELECT
        (SELECT COUNT(*) FROM "User" WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${from}) AS users,
        (SELECT COUNT(*) FROM "User" WHERE "isSupport" = false AND "isPlatform" = false AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS users_p,
        (SELECT COUNT(DISTINCT "userId") FROM "SiteVisit" WHERE "createdAt" >= ${from}) AS active,
        (SELECT COUNT(DISTINCT "userId") FROM "SiteVisit" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS active_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from}) AS topup,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS topup_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'COMMISSION' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from}) AS commission,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'COMMISSION' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS commission_p,
        (SELECT COALESCE(SUM(charge - COALESCE("refundAmount", 0)), 0) FROM "SmmOrder" WHERE status <> 'FAILED' AND "createdAt" >= ${from}) AS smm,
        (SELECT COALESCE(SUM(charge - COALESCE("refundAmount", 0)), 0) FROM "SmmOrder" WHERE status <> 'FAILED' AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS smm_p,
        (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= ${from}) AS orders,
        (SELECT COUNT(*) FROM "Order" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS orders_p,
        (SELECT COUNT(*) FROM "SmmOrder" WHERE "createdAt" >= ${from}) AS smm_orders,
        (SELECT COUNT(*) FROM "SmmOrder" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS smm_orders_p,
        (SELECT COUNT(*) FROM "Message" WHERE system = false AND "createdAt" >= ${from}) AS messages,
        (SELECT COUNT(*) FROM "Message" WHERE system = false AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS messages_p,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'PAYOUT' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from}) AS payout,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE type = 'PAYOUT' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS payout_p`,
    db.$queryRaw<Row[]>`SELECT status::text AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`SELECT type::text AS k, COUNT(*)::int AS n FROM "Order" WHERE "createdAt" >= ${from} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`
      SELECT s.platform AS k, COUNT(*)::int AS n, COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o."createdAt" >= ${from} AND o.status <> 'FAILED' GROUP BY 1 ORDER BY 3 DESC`,
    db.$queryRaw<Row[]>`SELECT status AS k, COUNT(*)::int AS n FROM "SmmOrder" WHERE "createdAt" >= ${from} GROUP BY 1 ORDER BY 2 DESC`,
    db.$queryRaw<Row[]>`
      SELECT s.name AS k, s.platform AS p, COUNT(*)::int AS n, COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o."createdAt" >= ${from} AND o.status <> 'FAILED' GROUP BY 1, 2 ORDER BY 4 DESC LIMIT 8`,
    db.$queryRaw<Row[]>`
      SELECT method AS k, COUNT(*)::int AS n, COALESCE(SUM(amount), 0)::bigint AS sum FROM "WalletTransaction"
      WHERE type = 'TOPUP' AND status = 'SUCCESS' AND "reversedAt" IS NULL AND "createdAt" >= ${from} GROUP BY 1 ORDER BY 3 DESC`,
    // hafta kuni (1 = dushanba) × soat — foydalanuvchi amallari va tashriflar
    db.$queryRaw<{ d: number; h: number; n: number }[]>`
      SELECT EXTRACT(ISODOW FROM t)::int AS d, EXTRACT(HOUR FROM t)::int AS h, COUNT(*)::int AS n FROM (
        SELECT ${local("createdAt")} AS t FROM "ActivityLog" WHERE "createdAt" >= ${from}
        UNION ALL
        SELECT ${local("createdAt")} AS t FROM "SiteVisit" WHERE "createdAt" >= ${from}
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
    range,
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

/** Toshkent bo'yicha bugungi sana "YYYY-MM-DD". */
export function todayTashkent() {
  return new Date(Date.now() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

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
      FROM "AuditLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`.catch(() => []),
    db.$queryRaw<{ h: number; n: number }[]>`
      SELECT ${h("createdAt")} AS h, COUNT(*)::int AS n FROM "ActivityLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<{ h: number; n: number; u: number }[]>`
      SELECT ${h("createdAt")} AS h, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS u FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
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
        SELECT COALESCE("userId", CASE WHEN actor = 'ADMIN' THEN 'admin' END, ip) AS p FROM "AuditLog" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
        UNION SELECT "userId" FROM "SiteVisit" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}
      ) x WHERE p IS NOT NULL`.catch(() => [{ n: 0 }]),
  ]);

  return { day, today, hours, total, peak: peak.i, people: people[0]?.n ?? 0 };
}
