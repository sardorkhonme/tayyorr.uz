import Link from "next/link";

import { loadFinance, PAYOUT_COMMISSION_PERCENT } from "@/lib/finance";
import { RANGES } from "@/lib/stats";
import { ColumnChart, InfoTip, LineChart } from "@/components/admin/stats/charts";
import { fmtValue } from "@/components/admin/stats/format";
import { Card } from "@/components/admin/stats/stats-view";
import { FinanceSettingsForm } from "@/components/admin/finance-settings";

const som = (v: number) => fmtValue(v, "som");

function Tile({ label, value, tone, info, sub }: { label: string; value: number; tone?: "good" | "bad"; info: string[]; sub?: string }) {
  return (
    <div className="viz-card relative flex flex-col gap-1 rounded-2xl p-4">
      <InfoTip className="!right-2.5 !top-2.5" text={info} />
      <span className="pr-7 text-xs" style={{ color: "var(--viz-muted)" }}>
        {label}
      </span>
      <span
        className="text-2xl font-semibold tabular-nums"
        style={{ color: tone === "good" ? "var(--viz-good)" : tone === "bad" ? "var(--viz-bad)" : "var(--viz-text)" }}
      >
        {som(value)}
      </span>
      {sub && (
        <span className="text-xs" style={{ color: "var(--viz-muted)" }}>
          {sub}
        </span>
      )}
    </div>
  );
}

/** Hisob qatori: belgi (+ / − / =), nom, izoh va summa. */
function Line({ sign, label, note, value, strong }: { sign: "+" | "−" | "="; label: string; note?: string; value: number; strong?: boolean }) {
  const color = sign === "−" ? "var(--viz-bad)" : sign === "=" ? "var(--viz-text)" : "var(--viz-good)";
  return (
    <div className={`flex items-baseline justify-between gap-3 py-2 ${strong ? "border-t pt-3" : ""}`} style={strong ? { borderColor: "var(--viz-grid)" } : undefined}>
      <span className="flex min-w-0 items-baseline gap-2">
        <span className="w-3 shrink-0 text-center font-semibold" style={{ color }}>
          {sign}
        </span>
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
      </span>
      <span className={`shrink-0 tabular-nums ${strong ? "text-lg font-semibold" : ""}`} style={{ color: sign === "=" ? (value < 0 ? "var(--viz-bad)" : "var(--viz-text)") : color }}>
        {sign === "−" && value > 0 ? "−" : ""}
        {som(value)}
      </span>
    </div>
  );
}

export async function FinanceView({ range }: { range: string }) {
  const f = await loadFinance(range);
  const t = f.total;
  const a = f.allTime;
  const per = f.unit === "month" ? "oylik" : "kunlik";
  const income = t.stars + t.payoutFee + t.smmMargin;

  return (
    <div className="viz flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Moliya</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Oxirgi {f.range.label}: saytga kirgan pul, tölov tizimlari olib qolgani, saytning daromadi va sof foyda
          </p>
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

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Tile
          label="Saytga kirgan pul"
          value={t.inflow}
          info={["Şu davrda foydalanuvçilar hamyoniga tuşgan barça pul: Click, Payme va admin qöl bilan qöşgan summalar.", "Bekor qilingan (qaytarib olingan) tölovlar kirmaydi."]}
          sub={`Click ${som(t.click)}${t.payme ? ` · Payme ${som(t.payme)}` : ""}`}
        />
        <Tile
          label="Tölov tizimlari olib qoldi"
          value={t.fees}
          tone="bad"
          info={[
            `Click har tölovdan ${f.settings.clickPct}% olib qoladi${f.settings.paymePct ? `, Payme — ${f.settings.paymePct}%` : ""}. Foydalanuvçi hamyoniga töliq summa tuşadi, şuning uçun bu sayt xarajati.`,
            "Foizni pastdagi «Sozlamalar»da özgartiriş mumkin.",
          ]}
        />
        <Tile
          label="Sayt daromadi"
          value={income}
          tone="good"
          info={[
            "Saytning özi işlab topgan pul (xarajatlar ayrilmasdan):",
            `star sotuvi + kartaga yeçişdan olinadigan ${PAYOUT_COMMISSION_PERCENT}% + SMM ustamasi (mijoz tölagani − provayderga ketgani).`,
          ]}
        />
        <Tile
          label="Sof foyda"
          value={t.profit}
          tone={t.profit >= 0 ? "good" : "bad"}
          info={["Sayt daromadi − tölov tizimlari olib qolgan pul.", "Bu şu davrda saytga aniq qolgan pul (server, reklama kabi boşqa xarajatlar hisobga olinmagan)."]}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card
          title="Hisob-kitob"
          icon="coins"
          sub={`Oxirgi ${f.range.label}`}
          info={[
            "Şu davrdagi pul harakati qadamma-qadam: qayerdan keldi, kim qança olib qoldi va saytga qança qoldi.",
            "SMM provayder xarajati — xizmatning hozirgi provayder narxi va joriy dollar kursi (CBU) böyiça, faqat yetkazilgan qism uçun (taxminiy).",
          ]}
        >
          <div className="text-sm">
            <p className="pb-1 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
              Kirgan pul
            </p>
            <Line sign="+" label="Click orqali" value={t.click} />
            {t.payme > 0 && <Line sign="+" label="Payme orqali" value={t.payme} />}
            {t.manual > 0 && <Line sign="+" label="Admin qöşgan" note="qöl bilan / naqd" value={t.manual} />}
            <Line sign="−" label="Tölov tizimlari olib qoldi" note={`Click ${f.settings.clickPct}%${f.settings.paymePct ? `, Payme ${f.settings.paymePct}%` : ""}`} value={t.fees} />

            <p className="pb-1 pt-4 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--viz-muted)" }}>
              Sayt daromadi
            </p>
            <Line sign="+" label="Star sotuvi" value={t.stars} />
            <Line sign="+" label={`Kartaga yeçiş komissiyasi (${PAYOUT_COMMISSION_PERCENT}%)`} note={`${som(t.payoutGross)} yeçildi, kartaga ${som(t.payoutSent)} ötkazildi`} value={t.payoutFee} />
            <Line sign="+" label="SMM — mijozlar töladi" value={t.smmNet} />
            <Line sign="−" label="SMM — provayderga ketdi" note={f.fx ? `1 $ = ${som(f.fx)}` : "dollar kursi yöq"} value={t.smmCost} />
            <Line sign="−" label="Tölov tizimlari olib qoldi" value={t.fees} />
            <Line sign="=" label="Sof foyda" value={t.profit} strong />
          </div>
        </Card>

        <Card
          title="Hisob holati — barça vaqt"
          icon="wallet"
          sub="Saytda qança pul turişi kerak va uning qançasi sizniki"
          info={[
            "Saytga tölov tizimlari orqali tuşgan real pul, ulardan komissiya, kartaga ötkazilgan va SMM provayderiga tölangan pul ayrilsa — hisobingizda turişi kerak bölgan summa çiqadi.",
            "Uning bir qismi foydalanuvçilarniki: ularning hamyonidagi pul va kutilayotgan yeçişlar. Qolgani — saytning özi işlab topgan puli.",
            "Admin qöl bilan qöşgan pul real pul hisobiga kirmaydi, lekin foydalanuvçi hamyonida turadi — şuning uçun «saytniki» kamroq çiqişi mumkin.",
          ]}
        >
          <div className="text-sm">
            <Line sign="+" label="Tölov tizimlaridan tuşgan" value={a.realIn} />
            <Line sign="−" label="Tölov tizimlari olib qoldi" value={a.fees} />
            <Line sign="−" label="Kartalarga ötkazildi" value={a.payoutSent} />
            <Line sign="−" label="SMM provayderiga ketdi" note="taxminiy" value={a.smmCost} />
            <Line sign="=" label="Hisobda turişi kerak" value={a.cash} strong />
            <div className="h-3" />
            <Line sign="−" label="Foydalanuvçilar hamyonida" note="ularniki — istalgan payt sarflaşi yoki yeçişi mumkin" value={a.userBalances} />
            <Line sign="−" label="Kutilayotgan yeçişlar" value={a.payoutPending} />
            <Line sign="=" label="Saytning öz puli" value={a.own} strong />
            {a.own < 0 && (
              <p className="mt-2 rounded-lg px-3 py-2 text-xs leading-relaxed" style={{ background: "var(--viz-grid)", color: "var(--viz-muted)" }}>
                Manfiy: foydalanuvçilar hamyonidagi pulning bir qismi real tölovsiz tuşgan (admin qöşgan yoki sinov/demo tölovlar). Bu pul
                sarflansa yoki yeçilsa, saytning öz hisobidan çiqadi.
              </p>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card
          title="Daromad tarkibi"
          icon="chart"
          sub={`Saytning daromadi — ${per}`}
          info={[
            "Har ustun — şu kun (yoki oy) daromadi: kök — star sotuvi, töq sariq — kartaga yeçiş komissiyasi, yaşil — SMM ustamasi.",
            "Ustun ustiga boring — aniq summalar çiqadi.",
          ]}
        >
          <ColumnChart
            labels={f.labels}
            f="som"
            series={[
              { name: "Star sotuvi", slot: 1, values: f.series.map((r) => r.stars) },
              { name: `Yeçiş ${PAYOUT_COMMISSION_PERCENT}%`, slot: 2, values: f.series.map((r) => r.payoutFee) },
              { name: "SMM ustamasi", slot: 3, values: f.series.map((r) => Math.max(r.smmMargin, 0)) },
            ]}
          />
        </Card>
        <Card
          title="Kirgan va çiqqan pul"
          icon="coins"
          sub={`Hamyonlarga tuşgan va kartalarga ötkazilgan pul — ${per}`}
          info={["Kök — foydalanuvçilar hamyoniga tuşgan pul, töq sariq — kartalariga ötkazilgan pul (komissiya ayrilgan holda).", "Kök töq sariqdan yuqori bölsa — saytga pul köproq kiryapti."]}
        >
          <LineChart
            labels={f.labels}
            f="som"
            series={[
              { name: "Kirdi", slot: 1, values: f.series.map((r) => r.inflow) },
              { name: "Kartaga çiqdi", slot: 2, values: f.series.map((r) => r.payoutSent) },
            ]}
          />
        </Card>
      </div>

      <Card
        title="Sozlamalar"
        icon="pencil"
        sub="Hisob şu foizlar böyiça qilinadi"
        info={[
          "Click va Payme har tölovdan qança foiz olib qolişini kiriting — Moliya darhol qayta hisoblanadi.",
          `Kartaga yeçiş komissiyasi (${PAYOUT_COMMISSION_PERCENT}%) sayt kodida belgilangan, SMM ustamasi — «tayyorr+» böliminda özgartiriladi.`,
        ]}
      >
        <div className="flex flex-col gap-4">
          <FinanceSettingsForm clickPct={f.settings.clickPct} paymePct={f.settings.paymePct} />
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ color: "var(--viz-muted)" }}>
            <span>
              Kartaga yeçiş komissiyasi: <b style={{ color: "var(--viz-text)" }}>{PAYOUT_COMMISSION_PERCENT}%</b>
            </span>
            <span>
              SMM ustamasi: <b style={{ color: "var(--viz-text)" }}>{f.smmMarkup}%</b>{" "}
              <Link href="/smm" className="underline">
                özgartiriş
              </Link>
            </span>
            <span>
              Dollar kursi: <b style={{ color: "var(--viz-text)" }}>{f.fx ? som(f.fx) : "—"}</b>
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
