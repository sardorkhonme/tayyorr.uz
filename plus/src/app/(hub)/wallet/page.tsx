import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { Icon } from "@/components/icons";
import { PayoutCancelButton, PayoutForm } from "@/components/payout-form";
import { TopupButton } from "@/components/topup-button";
import { db } from "@/lib/db";
import { som } from "@/lib/format";
import { PAYOUT_STATUS } from "@/lib/payout";
import {
  ensureWalletCode,
  expireStaleClickTopups,
  HIDE_UNFINISHED_TOPUPS,
  OUTFLOW,
  TXN_LABEL,
} from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hamyon" };

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** Hamyon — tayyorr.uz dagi bilan bir xil hisob va amallar tarixi (bitta hamyon). */
export default async function WalletPage({ searchParams }: { searchParams: Promise<{ topup?: string }> }) {
  const { topup } = await searchParams;
  const user = await currentUser();
  if (!user) redirect("/login");

  const walletCode = user.walletCode ?? (await ensureWalletCode(user.id));
  await expireStaleClickTopups(user.id);
  const [txns, payouts] = await Promise.all([
    db.walletTransaction.findMany({
      where: { userId: user.id, ...HIDE_UNFINISHED_TOPUPS },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    db.payoutRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-zinc-900">Hamyon</h1>
        <p className="mt-2 text-zinc-500">Barcha tayyorr xizmatlari uchun bitta hamyon — amallar hamma joyda bir xil.</p>
      </header>

      {topup && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          To&apos;lov tekshirilmoqda — o&apos;tgan bo&apos;lsa, balans bir necha soniyada yangilanadi. Sahifani yangilang.
        </div>
      )}

      {/* balans */}
      <section className="shine relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white shadow-xl shadow-violet-500/25">
        <p className="flex items-center gap-2 text-sm text-indigo-100">
          <Icon name="wallet" className="h-4 w-4" /> Joriy balans
        </p>
        <p className="mt-2 font-display text-4xl font-bold tracking-tight">{som(user.balance)}</p>
        <p className="mt-2 text-sm text-indigo-100">
          Hisob kodi: <span className="font-mono font-semibold text-white">{walletCode}</span>
        </p>
        <div className="relative z-[2] mt-6 flex flex-col gap-2 sm:flex-row">
          <TopupButton className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-indigo-700 transition hover:bg-indigo-50">
            <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} /> Hamyonni to&apos;ldirish
          </TopupButton>
          <a
            href="#payout"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/35 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
          >
            <Icon name="wallet" className="h-4 w-4" /> Kartaga yechish
          </a>
        </div>
      </section>

      <PayoutForm balance={user.balance} />

      {payouts.length > 0 && (
        <section>
          <h2 className="font-display text-xl font-bold text-zinc-900">Yechib olish so&apos;rovlari</h2>
          <ul className="mt-4 space-y-2.5">
            {payouts.map((p) => (
              <li key={p.id} className="card flex items-center gap-4 !rounded-2xl p-4">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                    {som(p.amount)}
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        p.status === "PAID"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "PENDING"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-zinc-100 text-zinc-500"
                      }`}
                    >
                      {PAYOUT_STATUS[p.status] ?? p.status}
                    </span>
                  </p>
                  <p className="mt-0.5 truncate text-sm text-zinc-500">
                    {dateFmt.format(p.createdAt)} · {p.card.slice(0, 4)} **** {p.card.slice(-4)}
                    {p.adminNote ? ` · ${p.status === "REJECTED" ? "Sabab: " : ""}${p.adminNote}` : ""}
                  </p>
                </div>
                {p.status === "PENDING" && <PayoutCancelButton id={p.id} />}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* amallar tarixi */}
      <section>
        <h2 className="font-display text-xl font-bold text-zinc-900">Amallar tarixi</h2>
        {txns.length === 0 ? (
          <div className="card mt-4 !rounded-3xl px-6 py-12 text-center text-zinc-500">Hozircha amallar yo&apos;q.</div>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {txns.map((tx) => {
              const reversed = !!tx.reversedAt;
              const failed = tx.status === "FAILED" && !reversed;
              const out = reversed || OUTFLOW.has(tx.type);
              return (
                <li key={tx.id}>
                  <Link href={`/wallet/${tx.id}`} className="card glow-card flex items-center gap-4 !rounded-2xl p-4">
                    <span
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${
                        reversed || failed
                          ? "bg-red-50 text-red-500"
                          : out
                            ? "bg-zinc-100 text-zinc-500"
                            : "bg-emerald-50 text-emerald-600"
                      }`}
                    >
                      <Icon name={out ? "arrow-right" : "plus"} className="h-5 w-5" strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-zinc-900">
                        {TXN_LABEL[tx.type] ?? tx.type}
                        {reversed && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">BEKOR QILINGAN</span>
                        )}
                        {failed && (
                          <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-600">XATOLIK</span>
                        )}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-zinc-500">
                        {dateFmt.format(tx.createdAt)}
                        {tx.note ? ` · ${tx.note}` : ""}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 font-display font-bold ${
                        reversed || failed ? "text-red-500 line-through" : out ? "text-zinc-700" : "text-emerald-600"
                      }`}
                    >
                      {out ? "−" : "+"}
                      {som(tx.amount)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
