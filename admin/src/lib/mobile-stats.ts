import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { bucketFmt, fill, local, todayTashkent, type Period, type Row } from "@/lib/stats";

/**
 * Mobil ilova statistikasi (admin «Statistika»).
 *  · faol — MobileDay (foydalanuvchi ilovadan foydalangan Toshkent kunlari);
 *  · ilovadan foydalanganmi — mobileFirstAt, eski hisoblarda: push tokeni yoki «(mobil ilova)» amali;
 *  · ilovada ochiq — oxirgi 30 kunda foydalangan va undan keyin ilovadan chiqmagan.
 */

/** Ilovada ro'yxatdan o'tganlar (eski email hisoblari — birinchi amali ilovada bo'lsa). */
export const APP_SIGNUP_SQL = Prisma.sql`(
  u."signupMethod" IN ('GOOGLE_MOBILE', 'EMAIL_MOBILE')
  OR (u."signupMethod" = 'EMAIL' AND (
    SELECT a.summary FROM "ActivityLog" a WHERE a."userId" = u.id ORDER BY a."createdAt" ASC LIMIT 1
  ) LIKE '%(mobil ilova)%')
)`;

/** Ilovadan foydalangan (hech bo'lmaganda bir marta). */
export const USED_APP_SQL = Prisma.sql`(
  u."mobileFirstAt" IS NOT NULL
  OR EXISTS (SELECT 1 FROM "DeviceToken" d WHERE d."userId" = u.id)
  OR EXISTS (SELECT 1 FROM "ActivityLog" a WHERE a."userId" = u.id AND a.summary LIKE '%(mobil ilova)%')
)`;

const BASE = Prisma.sql`u."isSupport" = false AND u."isPlatform" = false`;

export async function loadMobileStats(period: Period) {
  const { unit, from, to, prevFrom } = period;
  const bs = period.buckets;
  const fmt = bucketFmt(unit);
  const k = (col: string) => Prisma.sql`to_char(${local(col)}, ${fmt})`;
  // MobileDay.day — allaqachon Toshkent sanasi; soatlikda — o'sha kuni birinchi ochgan soati
  const dayKey = unit === "hour" ? Prisma.sql`to_char(${local("firstAt")}, 'HH24')` : Prisma.sql`to_char(day, ${fmt})`;
  const today = todayTashkent();
  const d = (n: number) => new Date(Date.parse(`${today}T00:00:00Z`) - n * 86400_000);
  const fromDay = new Date(Date.parse(`${period.fromDay}T00:00:00Z`));
  const toDay = new Date(Date.parse(`${period.toDay}T00:00:00Z`));
  const prevDay = new Date(fromDay.getTime() - (toDay.getTime() - fromDay.getTime()) - 86400_000);

  const [active, firsts, signups, downloads, kpi, totals] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT ${dayKey} AS k, COUNT(DISTINCT "userId")::int AS n FROM "MobileDay"
      WHERE day >= ${fromDay} AND day <= ${toDay} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("mobileFirstAt")} AS k, COUNT(*)::int AS n FROM "User" u
      WHERE ${BASE} AND "mobileFirstAt" >= ${from} AND "mobileFirstAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt")} AS k, COUNT(*)::int AS n FROM "User" u
      WHERE ${BASE} AND "createdAt" >= ${from} AND "createdAt" < ${to} AND ${APP_SIGNUP_SQL} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt")} AS k, COUNT(*)::int AS n FROM "AppDownload"
      WHERE "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Record<string, bigint | number>[]>`
      SELECT
        (SELECT COUNT(DISTINCT "userId") FROM "MobileDay" WHERE day >= ${fromDay} AND day <= ${toDay}) AS active,
        (SELECT COUNT(DISTINCT "userId") FROM "MobileDay" WHERE day >= ${prevDay} AND day < ${fromDay}) AS active_p,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND "mobileFirstAt" >= ${from} AND "mobileFirstAt" < ${to}) AS firsts,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND "mobileFirstAt" >= ${prevFrom} AND "mobileFirstAt" < ${from}) AS firsts_p,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND "createdAt" >= ${from} AND "createdAt" < ${to} AND ${APP_SIGNUP_SQL}) AS signups,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND "createdAt" >= ${prevFrom} AND "createdAt" < ${from} AND ${APP_SIGNUP_SQL}) AS signups_p,
        (SELECT COUNT(*) FROM "AppDownload" WHERE "createdAt" >= ${from} AND "createdAt" < ${to}) AS downloads,
        (SELECT COUNT(*) FROM "AppDownload" WHERE "createdAt" >= ${prevFrom} AND "createdAt" < ${from}) AS downloads_p`,
    db.$queryRaw<Record<string, bigint | number>[]>`
      SELECT
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND ${USED_APP_SQL}) AS used,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND "mobileLastAt" >= ${d(29)}
           AND ("mobileLogoutAt" IS NULL OR "mobileLogoutAt" < "mobileLastAt")) AS open,
        (SELECT COUNT(DISTINCT "userId") FROM "MobileDay" WHERE day = ${d(0)}) AS dau,
        (SELECT COUNT(DISTINCT "userId") FROM "MobileDay" WHERE day >= ${d(6)}) AS wau,
        (SELECT COUNT(DISTINCT "userId") FROM "MobileDay" WHERE day >= ${d(29)}) AS mau`,
  ]);

  const K = kpi[0];
  const pair = (a: string) => ({ cur: Number(K[a] ?? 0), prev: Number(K[`${a}_p`] ?? 0) });
  const T = totals[0];
  return {
    kpi: { active: pair("active"), firsts: pair("firsts"), signups: pair("signups"), downloads: pair("downloads") },
    totals: { used: Number(T.used), open: Number(T.open), dau: Number(T.dau), wau: Number(T.wau), mau: Number(T.mau) },
    series: {
      active: fill(bs, active, ["n"]),
      firsts: fill(bs, firsts, ["n"]),
      signups: fill(bs, signups, ["n"]),
      downloads: fill(bs, downloads, ["n"]),
    },
  };
}

export type MobileList = "app" | "downloaded" | "web-to-app";

export const MOBILE_LISTS: { key: MobileList; label: string; hint: string }[] = [
  { key: "app", label: "Ilovada röyxatdan ötganlar", hint: "Hisobini to'g'ridan-to'g'ri mobil ilovada yaratgan." },
  { key: "downloaded", label: "Saytdan yuklab olganlar", hint: "Saytda röyxatdan ötgan, keyin sayt içida «yuklab oliş» ni bosgan." },
  { key: "web-to-app", label: "Saytdan ilovaga ötganlar", hint: "Avval saytda röyxatdan ötgan, endi ilovaga kirgan." },
];

const LIST_WHERE: Record<MobileList, Prisma.Sql> = {
  app: APP_SIGNUP_SQL,
  downloaded: Prisma.sql`(NOT ${APP_SIGNUP_SQL} AND EXISTS (SELECT 1 FROM "AppDownload" x WHERE x."userId" = u.id))`,
  "web-to-app": Prisma.sql`(NOT ${APP_SIGNUP_SQL} AND ${USED_APP_SQL})`,
};

export type MobileListRow = {
  id: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  login: string | null;
  email: string | null;
  role: string | null;
  signupMethod: string | null;
  createdAt: Date;
  mobileFirstAt: Date | null;
  mobileLastAt: Date | null;
  downloadedAt: Date | null;
  usedApp: boolean;
};

export async function loadMobileList(list: MobileList, page: number, q?: string) {
  const size = 50;
  const search = q?.trim()
    ? Prisma.sql`AND (u.login ILIKE ${`%${q.trim()}%`} OR u.email ILIKE ${`%${q.trim()}%`} OR u."firstName" ILIKE ${`%${q.trim()}%`} OR u."lastName" ILIKE ${`%${q.trim()}%`})`
    : Prisma.empty;
  const where = Prisma.sql`${BASE} AND ${LIST_WHERE[list]} ${search}`;
  const [rows, counts] = await Promise.all([
    db.$queryRaw<MobileListRow[]>`
      SELECT u.id, u.name, u."firstName", u."lastName", u.login, u.email, u.role::text AS role, u."signupMethod", u."createdAt",
        u."mobileFirstAt", u."mobileLastAt",
        (SELECT MIN(x."createdAt") FROM "AppDownload" x WHERE x."userId" = u.id) AS "downloadedAt",
        ${USED_APP_SQL} AS "usedApp"
      FROM "User" u WHERE ${where}
      ORDER BY COALESCE(u."mobileLastAt", u."createdAt") DESC
      LIMIT ${size} OFFSET ${(page - 1) * size}`,
    db.$queryRaw<Record<string, bigint>[]>`
      SELECT
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND ${LIST_WHERE.app}) AS app,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND ${LIST_WHERE.downloaded}) AS downloaded,
        (SELECT COUNT(*) FROM "User" u WHERE ${BASE} AND ${LIST_WHERE["web-to-app"]}) AS "web-to-app",
        (SELECT COUNT(*) FROM "User" u WHERE ${where}) AS current`,
  ]);
  const c = counts[0];
  return {
    rows,
    total: Number(c.current),
    size,
    counts: { app: Number(c.app), downloaded: Number(c.downloaded), "web-to-app": Number(c["web-to-app"]) } as Record<MobileList, number>,
  };
}
