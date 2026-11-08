import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { getSmmSettings } from "@/lib/smm-settings";
import { bucketFmt, fill, local, type Period, type Row } from "@/lib/stats";

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

/** Sayt egasi bank hisobidan o'zi uchun yechib olgan pul (AppSetting "ownerWithdrawals"). */
export type OwnerWithdrawal = { id: string; date: string; amount: number; note?: string };
export const WITHDRAWALS_KEY = "ownerWithdrawals";

export async function getWithdrawals(): Promise<OwnerWithdrawal[]> {
  const row = await db.appSetting.findUnique({ where: { key: WITHDRAWALS_KEY } });
  try {
    const v = row ? (JSON.parse(row.value) as OwnerWithdrawal[]) : [];
    return Array.isArray(v) ? v.filter((w) => w && typeof w.amount === "number" && typeof w.date === "string") : [];
  } catch {
    return [];
  }
}

export async function saveWithdrawals(list: OwnerWithdrawal[]) {
  const value = JSON.stringify([...list].sort((a, b) => b.date.localeCompare(a.date)));
  await db.appSetting.upsert({ where: { key: WITHDRAWALS_KEY }, create: { key: WITHDRAWALS_KEY, value }, update: { value } });
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

export async function loadFinance(period: Period) {
  const { unit, from, to } = period;
  const bs = period.buckets;
  const fmt = bucketFmt(unit);
  const k = (col: string, alias = "") => Prisma.sql`to_char(${local(alias ? `${alias}"."${col}` : col)}, ${fmt})`;

  const [settings, smmSettings, deposits, withdrawals, providerRow] = await Promise.all([
    getFinanceSettings(),
    getSmmSettings(),
    getDeposits(),
    getWithdrawals(),
    db.appSetting.findUnique({ where: { key: "smmProviderLastBalance" } }),
  ]);
  const fx = smmSettings.usd?.rate ?? 0;
  const providerUsd = providerRow ? Number(providerRow.value) : NaN;
  // qo'lda kiritilgan yozuvlarda faqat sana bor — 1 kunlik ko'rinishda kun o'rtasiga (12:00) qo'yiladi
  const keyOf = (date: string) => (unit === "month" ? date.slice(0, 7) : unit === "hour" ? (date === period.fromDay ? "12" : "") : date.slice(0, 10));

  const [txns, payouts, smm, totals] = await Promise.all([
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt")} AS k,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method = 'CLICK'), 0)::bigint AS click,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method = 'PAYME'), 0)::bigint AS payme,
        COALESCE(SUM(amount) FILTER (WHERE type = 'TOPUP' AND method NOT IN ('CLICK', 'PAYME', 'DEMO')), 0)::bigint AS manual,
        COALESCE(SUM(amount) FILTER (WHERE type = 'COMMISSION'), 0)::bigint AS stars
      FROM "WalletTransaction" WHERE ${OK_TXN} AND "createdAt" >= ${from} AND "createdAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("resolvedAt")} AS k, COALESCE(SUM(amount), 0)::bigint AS gross, COUNT(*)::int AS n
      FROM "PayoutRequest" WHERE status = 'PAID' AND "resolvedAt" >= ${from} AND "resolvedAt" < ${to} GROUP BY 1`,
    db.$queryRaw<Row[]>`
      SELECT ${k("createdAt", "o")} AS k,
        COALESCE(SUM(o.charge - COALESCE(o."refundAmount", 0)), 0)::bigint AS net,
        COALESCE(SUM(s."providerRate" * ${SMM_DELIVERED} / 1000.0), 0)::float AS usd
      FROM "SmmOrder" o JOIN "SmmService" s ON s.id = o."serviceId"
      WHERE o.status <> 'FAILED' AND o."createdAt" >= ${from} AND o."createdAt" < ${to} GROUP BY 1`,
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
    // shu kun/oyda provayderga taşlangan pul va yo'lda olib qolingani
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
  // to'lov tizimlaridan tushgan real pul − ular olib qolgani − kartaga o'tkazilgani − provayderga taşlangani
  const allWithdrawn = withdrawals.reduce((a, w) => a + w.amount, 0);
  const cash = allClick + allPayme - allFees - allPayoutSent - allDepositPaid - allWithdrawn;
  // provayder hisobidagi qoldiq — sizning pulingiz (hali xizmatga sarflanmagan)
  const providerBalance = Number.isFinite(providerUsd) && fx ? Math.round(providerUsd * fx) : 0;
  const userBalances = Number(A.user_balances);

  return {
    period,
    unit,
    settings,
    deposits,
    withdrawals,
    // shu davrda o'zingiz uchun yechib olgan pul
    withdrawnInRange: withdrawals.filter((w) => w.date >= period.fromDay && w.date <= period.toDay).reduce((a, w) => a + w.amount, 0),
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
      withdrawn: allWithdrawn,
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

/** Barcha hisob amallari jadvali uchun bitta qator. amount: + kirim, − chiqim (o'sha hisob nuqtai nazaridan). */
export type LedgerRow = {
  id: string;
  at: Date;
  kind: "wallet" | "smmcloud" | "withdraw";
  type: string;
  userId: string | null;
  method: string | null;
  amount: number;
  status: string | null;
  note: string | null;
  href: string | null;
};

const TXN_LABEL: Record<string, string> = {
  TOPUP: "Hamyon töldirildi",
  SPEND: "Hamyondan tölov",
  TRANSFER_IN: "Ötkazma — kirdi",
  TRANSFER_OUT: "Ötkazma — çiqdi",
  PAYOUT: "Kartaga yeçiş",
  REFUND: "Qaytariş",
  HOLD: "Eskrouga bloklandi",
  RELEASE: "Iş haqi tuşdi",
  COMMISSION: "Sayt komissiyasi",
};
const MINUS = new Set(["SPEND", "TRANSFER_OUT", "PAYOUT", "HOLD"]);
const TASHKENT = (d: string) => new Date(`${d}T12:00:00+05:00`);

/** Davr ichidagi barcha pul harakatlari (eng yangisi tepada): hamyon amallari, smmcloud ga tashlash, o'zingiz yechgan. */
export async function loadLedger(period: Period, kind: string, limit: number) {
  const { from, to } = period;
  const inPeriod = (d: string) => d >= period.fromDay && d <= period.toDay;
  const want = (k: LedgerRow["kind"]) => kind === "all" || kind === k;

  const [txns, txnCount, deposits, withdrawals] = await Promise.all([
    want("wallet")
      ? db.walletTransaction.findMany({ where: { createdAt: { gte: from, lt: to } }, orderBy: { createdAt: "desc" }, take: limit })
      : Promise.resolve([]),
    want("wallet") ? db.walletTransaction.count({ where: { createdAt: { gte: from, lt: to } } }) : Promise.resolve(0),
    want("smmcloud") ? getDeposits() : Promise.resolve([]),
    want("withdraw") ? getWithdrawals() : Promise.resolve([]),
  ]);

  const rows: LedgerRow[] = [
    ...txns.map((t) => ({
      id: t.id,
      at: t.createdAt,
      kind: "wallet" as const,
      type: TXN_LABEL[t.type] ?? t.type,
      userId: t.userId,
      method: t.method,
      amount: MINUS.has(t.type) ? -t.amount : t.amount,
      status: t.reversedAt ? "Bekor qilingan" : t.status === "SUCCESS" ? null : t.status === "PENDING" ? "Kutilmoqda" : "Xato",
      note: t.note,
      href: `/payments/${t.id}`,
    })),
    ...deposits
      .filter((d) => inPeriod(d.date))
      .map((d) => ({
        id: d.id,
        at: TASHKENT(d.date),
        kind: "smmcloud" as const,
        type: "smmcloud ga taşlandi",
        userId: null,
        method: DEPOSIT_METHODS[d.method] ?? d.method,
        amount: -d.paid,
        status: null,
        note: [`yölda ${d.feePct}% = ${Math.round((d.paid * d.feePct) / 100).toLocaleString("ru-RU")} söm`, d.note].filter(Boolean).join(" · "),
        href: null,
      })),
    ...withdrawals
      .filter((w) => inPeriod(w.date))
      .map((w) => ({
        id: w.id,
        at: TASHKENT(w.date),
        kind: "withdraw" as const,
        type: "Özingiz yeçib oldingiz",
        userId: null,
        method: "Bank hisobi",
        amount: -w.amount,
        status: null,
        note: w.note ?? null,
        href: null,
      })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, limit);

  const ids = [...new Set(rows.map((r) => r.userId).filter((x): x is string => !!x))];
  const users = ids.length
    ? await db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, firstName: true, lastName: true, login: true, isPlatform: true } })
    : [];
  const total = txnCount + deposits.filter((d) => inPeriod(d.date)).length + withdrawals.filter((w) => inPeriod(w.date)).length;
  return { rows, users, total, more: total > rows.length };
}
