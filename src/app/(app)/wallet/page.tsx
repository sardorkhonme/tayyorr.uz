import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ensureWalletCode, formatSom } from "@/lib/wallet";
import { getRestriction } from "@/lib/restriction";
import { getT } from "@/lib/i18n-server";
import { WalletTopUp } from "@/components/wallet-topup";
import { WalletPayout } from "@/components/wallet-payout";
import { WalletBuyStars } from "@/components/wallet-buy-stars";
import { getStarPrice } from "@/lib/stars";
import { PayoutCancelButton } from "@/components/payout-cancel-button";
import { BalanceAmount } from "@/components/balance-amount";
import { WalletCode } from "@/components/wallet-code";
import { shortDateTime } from "@/lib/date";
import { MascotState } from "@/components/mascot";
import { expireStaleClickTopups, HIDE_UNFINISHED_TOPUPS } from "@/lib/wallet-pending";


const TXN_LABEL: Record<string, string> = {
  TOPUP: "Töldiriş",
  SPEND: "Buyurtma tölovi",
  TRANSFER_IN: "Kirim ötkazma",
  TRANSFER_OUT: "Çiqim ötkazma",
  PAYOUT: "Kartaga yeçiş",
  REFUND: "Qaytariş",
  HOLD: "Şartnoma uçun bloklandi",
  RELEASE: "Iş haqi (yakunlangan)",
  COMMISSION: "Sayt komissiyasi",
};
const OUTFLOW = new Set(["SPEND", "TRANSFER_OUT", "PAYOUT", "HOLD"]);

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ click?: string; topup?: string }>;
}) {
  const session = await auth();
  const userId = session!.user.id;
  const t = await getT();
  const sp = await searchParams;
  // yagona to'lov sahifasidan (plus.tayyorr.uz/pay) qaytganda ?topup=1
  const fromClick = sp.click === "1" || sp.topup === "1";
  const PAYOUT_STATUS: Record<string, string> = {
    PENDING: t("payout.PENDING"),
    PAID: t("payout.PAID"),
    REJECTED: t("payout.REJECTED"),
    CANCELLED: t("payout.CANCELLED"),
  };
  // hisob cheklangan bo'lsa ham hamyon ochiq — foydalanuvchi pulini yechib olishi kerak
  const restriction = await getRestriction(userId);

  const walletCode = await ensureWalletCode(userId);
  await expireStaleClickTopups(userId);
  const [user, txns, payouts] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { balance: true, starBalance: true, login: true, role: true },
    }),
    db.walletTransaction.findMany({
      // tugallanmagan Click to'lovi tarixda ko'rinmaydi — to'langach yoki xatolik bo'lgach chiqadi
      where: { userId, ...HIDE_UNFINISHED_TOPUPS },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    db.payoutRequest.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const balance = user?.balance ?? 0;

  return (
    <div className="flex flex-col gap-6">
      {fromClick && (
        <p className="rounded-xl border border-indigo-400/30 bg-indigo-500/10 p-3 text-sm text-indigo-200">
          Tölovingiz qayta işlanmoqda. Bir neça soniyadan söng balansingiz
          yangilanadi — topilmasa sahifani qayta yuklang.
        </p>
      )}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">{t("wallet.title")}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          {t("wallet.subtitle")}
        </p>
      </div>

      {/* balans karta */}
      <div className="card">
        <div>
          <div className="text-sm text-zinc-400">{t("wallet.current")}</div>
          <BalanceAmount
            value={balance}
            className="mt-1 text-4xl font-semibold tracking-tight text-white"
          />
          <div>
            <WalletCode code={walletCode} />
          </div>
        </div>
      </div>

      {restriction && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Hisobingiz çeklangan bölsa ham hamyon oçiq: mablağingizni kartaga
          yeçib olişingiz mumkin.
        </p>
      )}

      {/* star faqat tayyorlovchiga kerak — buyurtma beruvchida ariza/navbat
          yo'q, shuning uchun starni ishlata olmaydi. Referal esa alohida
          /referral sahifasida (navbardan) — taklif qilinganlar ro'yxati
          bilan birga. */}
      {user?.role === "PREPARER" && (
        <WalletBuyStars starBalance={user?.starBalance ?? 0} starPrice={await getStarPrice()} />
      )}

      <WalletTopUp />

      <WalletPayout balance={balance} />

      {payouts.length > 0 && (
        <div>
          <h2 className="mb-3 px-1 text-base font-semibold text-white">{t("wallet.withdrawals")}</h2>
          <ul className="flex flex-col gap-2">
            {payouts.map((p) => (
              <li
                key={p.id}
                className="card flex items-center justify-between gap-3 py-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-white">
                    {formatSom(p.amount)}
                    <span
                      className={`ml-2 text-xs ${
                        p.status === "PAID"
                          ? "text-emerald-400"
                          : p.status === "PENDING"
                            ? "text-amber-400"
                            : "text-zinc-500"
                      }`}
                    >
                      {PAYOUT_STATUS[p.status]}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {shortDateTime(p.createdAt)}
                    {p.adminNote ? ` · ${p.status === "REJECTED" ? "Sabab: " : ""}${p.adminNote}` : ""}
                  </div>
                </div>
                {p.status === "PENDING" && <PayoutCancelButton id={p.id} />}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* tarix */}
      <div>
        <h2 className="mb-3 px-1 text-base font-semibold text-white">Amallar tarixi</h2>
        {txns.length === 0 ? (
          <div className="card">
            <MascotState
              pose="wallet-empty"
              size={130}
              title="Hozirça amallar yöq"
              message="Hisobni töldirsangiz yoki star sotib olsangiz, barça amallar şu yerda körinadi."
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {txns.map((tx) => {
              const reversed = !!tx.reversedAt;
              const failed = tx.status === "FAILED" && !reversed;
              const out = reversed || OUTFLOW.has(tx.type);
              return (
                <li key={tx.id}>
                <Link
                  href={`/wallet/${tx.id}`}
                  className="card flex items-center justify-between gap-3 py-3 transition hover:bg-white/[0.06]"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">
                      {TXN_LABEL[tx.type] ?? tx.type}
                      {tx.method === "DEMO" && (
                        <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          DEMO
                        </span>
                      )}
                      {reversed && (
                        <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          BEKOR QILINGAN
                        </span>
                      )}
                      {failed && (
                        <span className="ml-2 rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
                          XATOLIK
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-zinc-500">
                      {shortDateTime(tx.createdAt)}
                      {tx.note ? ` · ${tx.note}` : ""}
                    </div>
                  </div>
                  <div
                    className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
                      reversed || failed
                        ? "text-red-400 line-through"
                        : out
                          ? "text-zinc-300"
                          : "text-emerald-400"
                    }`}
                  >
                    {out ? "−" : "+"}
                    {formatSom(tx.amount)}
                  </div>
                </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
