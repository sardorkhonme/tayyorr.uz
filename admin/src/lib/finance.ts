import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getSmmSettings } from "@/lib/smm-settings";
import { buckets, fill, local, RANGES, type Row } from "@/lib/stats";

/**
 * Moliya paneli: saytga kirgan va chiqqan pul, to'lov tizimlari olib qoladigan foiz,
 * saytning o'z daromadi (star sotuvi, kartaga yechish komissiyasi, SMM ustamasi) va sof foyda.
 *
 * Sozlama — AppSetting "finance": { clickPct, paymePct, deposit: { crypto, card, other } } (admin paneldan).
 * Provayderga (smmcloud) pul tashlashlar — AppSetting "smmProviderDeposits" (ro'yxat): sana, to'langan so'm,
 * usul va olib qolingan foiz. Provayder hisobidagi qoldiq — "smmProviderLastBalance" (smm-app yozadi, USD).
 * Kartaga yechish komissiyasi — src/lib/payout-commission.ts (5%) bilan bir xil.
 */
export const FINANCE_KEY = "finance";
export const PAYOUT_COMMISSION_PERCENT = 5;
export const DEPOSIT_METHODS = { crypto: "Kripto (USDT)", card: "Karta", other: "Boşqa" } as const;
export type DepositMethod = keyof typeof DEPOSIT_METHODS;
export type FinanceSettings = { clickPct: number; paymePct: number; deposit: Record<DepositMethod, number> };
const DEFAULTS: FinanceSettings = { clickPct: 2.5, paymePct: 0, deposit: { crypto: 0, card: 0, other: 0 } };

/** Provayderga pul tashlash: paid — siz to'lagan so'm, feePct — yo'lda olib qolingan foiz. */
export type ProviderDeposit = { id: string; date: string; method: DepositMethod; paid: number; feePct: number; note?: string };
export const DEPOSITS_KEY = "smmProviderDeposits";
export const depositFee = (d: ProviderDeposit) => Math.round((d.paid * d.feePct) / 100);

export async function getDeposits(): Promise<ProviderDeposit[]> {
  const row = await db.appSetting.findUnique({ where: { key: DEPOSITS_KEY } });
  try {
    const v = row ? (JSON.parse(row.value) as ProviderDeposit[]) : [];
    return Array.isArray(v) ? v.filter((d) => d && typeof d.paid === "number" && typeof d.date === "string") : [];
  } catch {
    return [];
  }
}

export async function saveDeposits(list: ProviderDeposit[]) {
  const value = JSON.stringify([...list].sort((a, b) => b.date.localeCompare(a.date)));
  await db.appSetting.upsert({ where: { key: DEPOSITS_KEY }, create: { key: DEPOSITS_KEY, value }, update: { value } });
}

export async function getFinanceSettings(): Promise<FinanceSettings> {
  const row = await db.appSetting.findUnique({ where: { key: FINANCE_KEY } });
  try {
    const v = row ? (JSON.parse(row.value) as Partial<FinanceSettings>) : {};
    const n = (x: unknown, d: number) => (typeof x === "number" && Number.isFinite(x) && x >= 0 && x <= 50 ? x : d);
    const dep = (v.deposit ?? {}) as Partial<Record<DepositMethod, number>>;
    return {
      clickPct: n(v.clickPct, DEFAULTS.clickPct),
      paymePct: n(v.paymePct, DEFAULTS.paymePct),
      deposit: { crypto: n(dep.crypto, 0), card: n(dep.card, 0), other: n(dep.other, 0) },
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveFinanceSettings(s: FinanceSettings) {
  const value = JSON.stringify(s);
  await db.appSetting.upsert({ where: { key: FINANCE_KEY }, create: { key: FINANCE_KEY, value }, update: { value } });
}

// SMM: yetkazilgan miqdor (smm-app progressOf bilan bir xil) × provayder narxi (USD / 1000)
const SMM_DELIVERED = Prisma.raw(`LEAST(GREATEST(CASE WHEN o.remains IS NOT NULL THEN o.quantity - GREATEST(o.remains, 0)
  WHEN o.status = 'COMPLETED' THEN o.quantity ELSE 0 END, 0), o.quantity)`);
const OK_TXN = Prisma.raw(`status = 'SUCCESS' AND "reversedAt" IS NULL`);

export async function loadFinance(rangeKey: string) {
  const range = RANGES.find((r) => r.key === rangeKey) ?? RANGES[1];
  const unit = range.days > 90 ? "month" : "day";
  const bs = buckets(range.days, unit);
  const from = bs[0].from;
  const fmt = Prisma.raw(unit === "month" ? `'YYYY-MM'` : `'YYYY-MM-DD'`);
  const k = (col: string, alias = "") => Prisma.sql`to_char(${local(alias ? `${alias}"."${col}` : col)}, ${fmt})`;

  const [settings, smmSettings, deposits, providerRow] = await Promise.all([
    getFinanceSettings(),
    getSmmSettings(),
    getDeposits(),
    db.appSetting.findUnique({ where: { key: "smmProviderLastBalance" } }),
  ]);
  const fx = smmSettings.usd?.rate ?? 0;
  const providerUsd = providerRow ? Number(providerRow.value) : NaN;
  const keyOf = (date: string) => (unit === "month" ? date.slice(0, 7) : date.slice(0, 10));

  const [txns, payouts, smm, totals] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt")} AS k,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method = 'CLICK'), 0)::bigint AS click,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method = 'PAYME'), 0)::bigint AS payme,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method NOT IN ('CLICK', 'PAYME', 'DEMO')), 0)::bigint AS manual,
        COALESCE(SUM(amount) FILTER (WHERE type = 'COMMISSION'), 0)::bigint AS stars
      FROM "WalletTransaction" WHERE ${OK_TXN} AND "createdAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("resolvedAt")} AS k, COALESCE(SUM(amount), 0)::bigint AS gross, COUNT(*)::int AS n
      FROM "PayoutRequest" WHERE status = 'PAID' AND "resolvedAt" >= ${from} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt", "o")} AS k,
        COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net,
        COALESCE(SUM(s."providerRate" * ${SMM_DELIVERED} / 1000.0), 0)::float AS usd
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o.status <> 'FAILED' AND o."createdAt" >= ${from} GROUP BY 1`,
    // butun vaqt: qancha pul saytda turishi kerak
    db.$queryRaw<Record<string, number | bigint>[]>`
      SELECT
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE ${OK_TXN} AND type = 'TOPUP' AND method = 'CLICK') AS click,
        (SELECT COALESCE(SUM(amount), 0) FROM "WalletTransaction" WHERE ${OK_TXN} AND type = 'TOPUP' AND method = 'PAYME') AS payme,
        (SELECT COALESCE(SUM(amount), 0) FROM "PayoutRequest" WHERE status = 'PAID') AS payout_gross,
        (SELECT COALESCE(SUM(s."providerRate" * ${SMM_DELIVERED} / 1000.0), 0)::float FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId" WHERE o.status <> 'FAILED') AS smm_usd,
        (SELECT COALESCE(SUM(balance), 0) FROM "User" WHERE "isSupport" = false AND "isPlatform" = false) AS user_balances,
        (SELECT COALESCE(SUM(amount), 0) FROM "PayoutRequest" WHERE status = 'PENDING') AS payout_pending`,
  ]);

  const T = fill(bs, txns, ["click", "payme", "manual", "stars"]);
  const P = fill(bs, payouts, ["gross", "n"]);
  const M = fill(bs, smm, ["net", "usd"]);
  const pct = (v: number, p: number) => Math.round((v * p) / 100);

  // har bir davr (kun/oy) uchun hisob
  const series = bs.map((b, i) => {
    const [click, payme, manual, stars] = T[i].values;
    const [payoutGross] = P[i].values;
    const [smmNet, smmUsd] = M[i].values;
    const smmCost = Math.round(smmUsd * fx);
    const fees = pct(click, settings.clickPct) + pct(payme, settings.paymePct);
    const payoutFee = Math.ceil((payoutGross * PAYOUT_COMMISSION_PERCENT) / 100);
    const smmMargin = smmNet - smmCost;
    // shu kun/oyda provayderga tashlangan pul va yo'lda olib qolingani
    const deps = deposits.filter((d) => keyOf(d.date) === b.key);
    const depositPaid = deps.reduce((a, d) => a + d.paid, 0);
    const depositFees = deps.reduce((a, d) => a + depositFee(d), 0);
    return {
      label: b.label,
      inflow: click + payme + manual,
      click,
      payme,
      manual,
      fees,
      payoutGross,
      payoutSent: payoutGross - payoutFee,
      payoutFee,
      stars,
      smmNet,
      smmCost,
      smmMargin,
      depositPaid,
      depositFees,
      profit: stars + payoutFee + smmMargin - fees - depositFees,
    };
  });
  const sum = (key: keyof (typeof series)[number]) => series.reduce((a, r) => a + (r[key] as number), 0);

  const A = totals[0];
  const allClick = Number(A.click);
  const allPayme = Number(A.payme);
  const allPayoutGross = Number(A.payout_gross);
  const allFees = pct(allClick, settings.clickPct) + pct(allPayme, settings.paymePct);
  const allPayoutSent = allPayoutGross - Math.ceil((allPayoutGross * PAYOUT_COMMISSION_PERCENT) / 100);
  const allSmmCost = Math.round(Number(A.smm_usd) * fx);
  const allDepositPaid = deposits.reduce((a, d) => a + d.paid, 0);
  const allDepositFees = deposits.reduce((a, d) => a + depositFee(d), 0);
  // to'lov tizimlaridan tushgan real pul − ular olib qolgani − kartaga o'tkazilgani − provayderga tashlangani
  const cash = allClick + allPayme - allFees - allPayoutSent - allDepositPaid;
  // provayder hisobidagi qoldiq — sizning pulingiz (hali xizmatga sarflanmagan)
  const providerBalance = Number.isFinite(providerUsd) && fx ? Math.round(providerUsd * fx) : 0;
  const userBalances = Number(A.user_balances);

  return {
    range,
    unit,
    settings,
    deposits,
    smmMarkup: smmSettings.markupPercent,
    fx,
    labels: series.map((r) => r.label),
    series,
    total: {
      inflow: sum("inflow"),
      click: sum("click"),
      payme: sum("payme"),
      manual: sum("manual"),
      fees: sum("fees"),
      payoutGross: sum("payoutGross"),
      payoutSent: sum("payoutSent"),
      payoutFee: sum("payoutFee"),
      stars: sum("stars"),
      smmNet: sum("smmNet"),
      smmCost: sum("smmCost"),
      smmMargin: sum("smmMargin"),
      depositPaid: sum("depositPaid"),
      depositFees: sum("depositFees"),
      profit: sum("profit"),
    },
    allTime: {
      realIn: allClick + allPayme,
      fees: allFees,
      payoutSent: allPayoutSent,
      smmCost: allSmmCost,
      depositPaid: allDepositPaid,
      depositFees: allDepositFees,
      providerUsd: Number.isFinite(providerUsd) ? providerUsd : null,
      providerBalance,
      cash,
      userBalances,
      payoutPending: Number(A.payout_pending),
      // foydalanuvchilar hamyonidagi va yechish kutilayotgan pul — ularniki (sayt qarzi)
      own: cash + providerBalance - userBalances - Number(A.payout_pending),
    },
  };
}

export type Finance = Awaited<ReturnType<typeof loadFinance>>;
