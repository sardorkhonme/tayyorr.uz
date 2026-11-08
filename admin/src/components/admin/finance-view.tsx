import Link from "next/link";

import { loadFinance, PAYOUT_COMMISSION_PERCENT } from "@/lib/finance";
import { RANGES, todayTashkent } from "@/lib/stats";
import { ColumnChart, InfoTip } from "@/components/admin/stats/charts";
import { fmtValue } from "@/components/admin/stats/format";
import { Card } from "@/components/admin/stats/stats-view";
import { FinanceSettingsForm, OwnerWithdrawals, ProviderDeposits } from "@/components/admin/finance-settings";
import { Icon } from "@/components/icons";
import { FinanceLedger } from "@/components/admin/finance-ledger";

/**
 * Moliya — oddiy tilda: 1) "Qancha pul ishladim?" (davr bo'yicha sof foyda va u qayerdan keldi),
 * 2) "Pulim hozir qayerda?" (barcha vaqt). Batafsil hisob-kitob, pul tashlash va sozlamalar — pastda.
 */
const som = (v: number) => fmtValue(v, "som");

/** Oddiy qator: nom (+ izoh) va summa — kirim yashil, chiqim qizil. */
function Row({ label, note, value, minus, strong }: { label: string; note?: string; value: number; minus?: boolean; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2.5 ${strong ? "mt-1 border-t pt-3.5" : ""}`} style={strong ? { borderColor: "var(--viz-grid)" } : undefined}>
      <span className="min-w-0">
        <span className={`block ${strong ? "font-semibold" : ""}`} style={{ color: "var(--viz-text)" }}>
          {label}
        </span>
        {note && (
          <span className="block text-xs" style={{ color: "var(--viz-muted)" }}>
            {note}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 tabular-nums ${strong ? "text-xl font-semibold" : ""}`}
        style={{ color: strong ? (value < 0 ? "var(--viz-bad)" : "var(--viz-good)") : minus ? "var(--viz-bad)" : "var(--viz-text)" }}
      >
        {minus && value > 0 ? "−" : ""}
        {som(value)}
      </span>
    </div>
  );
}

export async function FinanceView({ range, kind = "all", limit = 100 }: { range: string; kind?: string; limit?: number }) {
  const f = await loadFinance(range);
  const t = f.total;
  const a = f.allTime;
  const per = f.unit === "month" ? "oylar" : "kunlar";
  const earned = t.stars + t.payoutFee + t.smmMargin;
  const lost = t.fees + t.depositFees;
  const where = [
    {
      label: "Kartangiz / bank hisobingizda",
      note:
        a.cash < 0
          ? "minus — smmcloud ga saytga tuşgandan köp pul tashlagansiz (öz hisobingizdan qöşgansiz)"
          : `tuşgan pul − komissiyalar − kartalarga ötkazilgan − smmcloud ga tashlangan${a.withdrawn ? " − siz yeçib olgan" : ""}`,
      value: a.cash,
    },
    {
      label: "smmcloud hisobida",
      note: a.providerUsd != null ? `$${a.providerUsd.toFixed(2)} — hali buyurtmalarga sarflanmagan` : "balans hali tekşirilmagan",
      value: a.providerBalance,
    },
  ];
  const total = a.cash + a.providerBalance;
  const owed = a.userBalances + a.payoutPending;

  return (
    <div className="viz flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Moliya</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Qança pul işladingiz va pulingiz hozir qayerda</p>
        </div>
        <nav className="viz-card inline-flex rounded-xl p-1 text-sm">
          {RANGES.map((x) => (
            <Link
              key={x.key}
              href={`/finance?r=${x.key}`}
              className="rounded-lg px-3 py-1.5 font-medium transition"
              style={x.key === f.range.key ? { background: "var(--viz-1)", color: "#fff" } : { color: "var(--viz-muted)" }}
            >
              {x.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* 1. qancha ishladim */}
        <section className="viz-card relative rounded-2xl p-5 sm:p-6">
          <InfoTip
            className="sm:!right-4 sm:!top-4"
            text={[
              "Sof foyda — saytning özi işlab topgan pul, komissiyalar ayrilgandan keyin. Foydalanuvçilarning hamyonga tashlagan puli bu yerga kirmaydi — u ularniki.",
              `SMM: mijoz tölagan narx − smmcloud ga ketgan narx (taxminiy, hozirgi kurs böyiça). Kartaga yeçiş: har yeçişdan ${PAYOUT_COMMISSION_PERCENT}% sizda qoladi.`,
              "Server, reklama kabi boşqa xarajatlar hisobga olinmagan.",
            ]}
          />
          <p className="text-sm" style={{ color: "var(--viz-muted)" }}>
            Oxirgi {f.range.label}da işlagan pulingiz
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: t.profit < 0 ? "var(--viz-bad)" : "var(--viz-good)" }}>
            {som(t.profit)}
          </p>
          <div className="mt-4 text-sm">
            <Row label="SMM xizmatlardan foyda" note={`mijozlar ${som(t.smmNet)} töladi, smmcloud ga ≈${som(t.smmCost)} ketdi`} value={t.smmMargin} />
            <Row label={`Kartaga yeçişdan ${PAYOUT_COMMISSION_PERCENT}%`} note={t.payoutGross ? `${som(t.payoutGross)} yeçildi` : undefined} value={t.payoutFee} />
            {t.stars > 0 && <Row label="Star sotuvi" value={t.stars} />}
            <Row
              label="Komissiyalarga ketdi"
              note={`Click ${f.settings.clickPct}%${t.depositFees ? ` · smmcloud ga tashlaşda ${som(t.depositFees)}` : ""}`}
              value={lost}
              minus
            />
            <Row label="Sof foyda" value={t.profit} strong />
          </div>
          {earned === 0 && lost === 0 && (
            <p className="mt-2 text-xs" style={{ color: "var(--viz-muted)" }}>
              Bu davrda daromad yöq.
            </p>
          )}
        </section>

        {/* 2. pulim qayerda */}
        <section className="viz-card relative rounded-2xl p-5 sm:p-6">
          <InfoTip
            className="sm:!right-4 sm:!top-4"
            text={[
              "Saytga tuşgan barça real pulingiz hozir qayerda turgani (butun vaqt davomida).",
              "Uning bir qismi foydalanuvçilarniki — ular hamyonidagi pulni istalgan payt sarflaşi yoki kartaga yeçişi mumkin. Qolgani — sizniki.",
              "Aniq çiqişi uçun smmcloud ga tashlagan har bir pulingizni pastdagi «smmcloud ga pul tashlaş»ga kiriting.",
            ]}
          />
          <p className="text-sm" style={{ color: "var(--viz-muted)" }}>
            Pulingiz hozir qayerda
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums" style={{ color: "var(--viz-text)" }}>
            {som(total)}
          </p>
          <div className="mt-4 text-sm">
            {where.map((w) => (
              <Row key={w.label} label={w.label} note={w.note} value={w.value} />
            ))}
            <Row label="Şundan foydalanuvçilarniki" note="ularning hamyonidagi va yeçiş kutayotgan pul" value={owed} minus />
            <Row label="Sizniki" note="hali saytda turgan, istalgan payt yeçib oliş mumkin" value={a.own} strong />
            {a.withdrawn > 0 && <Row label="Siz yeçib olgansiz (barça vaqt)" note="bank hisobidan özingiz uçun" value={a.withdrawn} />}
          </div>
          {(f.deposits.length === 0 || a.own < 0) && (
            <p className="mt-3 flex gap-2 rounded-lg px-3 py-2.5 text-xs leading-relaxed" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
              <Icon name="alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                {f.deposits.length === 0
                  ? "smmcloud ga tashlagan pullaringiz hali kiritilmagan — şuning uçun bu hisob töliq emas. Pastda kiriting."
                  : "Minus: foydalanuvçilar hamyonidagi pulning bir qismi real tölovsiz tuşgan (admin qöşgan yoki sinov tölovlari)."}
              </span>
            </p>
          )}
        </section>
      </div>

      <Card
        title="Foyda — kunma-kun"
        icon="chart"
        sub={`Har ${per} böyiça işlagan pulingiz`}
        info={["Har ustun — şu kun (yoki oy) saytning daromadi: kök — SMM foydasi, töq sariq — kartaga yeçiş foizi, yaşil — star sotuvi.", "Ustun ustiga boring — aniq summalar çiqadi."]}
      >
        <ColumnChart
          labels={f.labels}
          f="som"
          series={[
            { name: "SMM foydasi", slot: 1, values: f.series.map((r) => Math.max(r.smmMargin, 0)) },
            { name: `Yeçiş ${PAYOUT_COMMISSION_PERCENT}%`, slot: 2, values: f.series.map((r) => r.payoutFee) },
            { name: "Star sotuvi", slot: 3, values: f.series.map((r) => r.stars) },
          ]}
        />
      </Card>

      <Card
        title="Bank hisobidan pul yeçiş"
        icon="banknote"
        sub={`Özingiz uçun yeçib olgan pul · şu davrda ${som(f.withdrawnInRange)}, sizniki hozir ${som(Math.max(a.own, 0))}`}
        info={[
          "Saytning bank hisobidan (merchant hisob) özingiz uçun pul yeçganingizda şu yerga yozing: sana va summa.",
          "Yeçilgan pul «Kartangiz / bank hisobingizda» va «Sizniki» dan ayriladi — şunda sayt hisobida qança qolgani aniq körinadi. Foydaga taʼsir qilmaydi: bu xarajat emas, işlagan pulingizni olişingiz.",
          "Foydalanuvçilarniki bölgan pulni yeçib olmang — ular uni istalgan payt sarflaşi yoki yeçişi mumkin.",
        ]}
      >
        <OwnerWithdrawals items={f.withdrawals} today={todayTashkent()} available={a.own} />
      </Card>

      <Card
        title="smmcloud ga pul tashlaş"
        icon="rocket"
        sub="Har pul tashlaganingizda şu yerga yozing — hisob aniq böladi"
        info={[
          "smmcloud hisobini töldirganingizda kiriting: sana, kartangizdan qança söm ketdi va yölda neça foiz olib qolindi (masalan kartadan Binance ga 2%).",
          "Olib qolingan pul — xarajat, foydadan ayriladi. Xato yozuvni savat belgisi bilan öçiring.",
        ]}
      >
        <ProviderDeposits deposits={f.deposits} defaults={f.settings.deposit} today={todayTashkent()} />
      </Card>

      {/* batafsil — xohlagan odam ochadi */}
      <details className="viz-card group rounded-2xl">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 font-semibold" style={{ color: "var(--viz-text)" }}>
          Batafsil hisob-kitob va sozlamalar
          <span className="grid h-8 w-8 place-items-center rounded-full text-lg transition group-open:rotate-45" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
            +
          </span>
        </summary>
        <div className="grid gap-6 px-5 pb-5 lg:grid-cols-2">
          <div className="text-sm">
            <p className="pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
              Oxirgi {f.range.label} — pul harakati
            </p>
            <Row label="Hamyonlarga tuşdi (Click)" value={t.click} />
            {t.payme > 0 && <Row label="Hamyonlarga tuşdi (Payme)" value={t.payme} />}
            {t.manual > 0 && <Row label="Admin qöl bilan qöşdi" value={t.manual} />}
            <Row label={`Click olib qoldi (${f.settings.clickPct}%)`} value={t.fees} minus />
            <Row label="Kartalarga ötkazildi" note={`${som(t.payoutGross)} yeçildi, ${PAYOUT_COMMISSION_PERCENT}% sizda qoldi`} value={t.payoutSent} minus />
            <Row label="smmcloud ga tashlandi" note={`yölda olib qolindi ${som(t.depositFees)}`} value={t.depositPaid} minus />
            <Row label="SMM — mijozlar töladi" value={t.smmNet} />
            <Row label="SMM — smmcloud narxi" note={f.fx ? `taxminiy, 1 $ = ${som(f.fx)}` : "dollar kursi yöq"} value={t.smmCost} minus />
          </div>
          <div className="text-sm">
            <p className="pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
              Butun vaqt
            </p>
            <Row label="Click / Payme dan tuşgan" value={a.realIn} />
            <Row label="Click / Payme olib qoldi" value={a.fees} minus />
            <Row label="Kartalarga ötkazildi" value={a.payoutSent} minus />
            <Row label="smmcloud ga tashlandi" note={`yölda olib qolindi ${som(a.depositFees)}`} value={a.depositPaid} minus />
            <Row label="Foydalanuvçilar hamyonida" value={a.userBalances} />
            <Row label="Yeçiş kutilmoqda" value={a.payoutPending} />
          </div>
          <div className="lg:col-span-2">
            <p className="pb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
              Sozlamalar — kim qança foiz olib qoladi
            </p>
            <FinanceSettingsForm clickPct={f.settings.clickPct} paymePct={f.settings.paymePct} deposit={f.settings.deposit} />
            <p className="mt-3 text-xs" style={{ color: "var(--viz-muted)" }}>
              Kartaga yeçiş foizi: <b style={{ color: "var(--viz-text)" }}>{PAYOUT_COMMISSION_PERCENT}%</b> · SMM ustamasi:{" "}
              <b style={{ color: "var(--viz-text)" }}>{f.smmMarkup}%</b>{" "}
              <Link href="/smm" className="underline">
                özgartiriş
              </Link>{" "}
              · Dollar kursi: <b style={{ color: "var(--viz-text)" }}>{f.fx ? som(f.fx) : "—"}</b>
            </p>
          </div>
        </div>
      </details>

      <FinanceLedger range={f.range.key} kind={kind} limit={limit} />
    </div>
  );
}
