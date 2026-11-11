import Link from "next/link";

import { loadMobileStats } from "@/lib/mobile-stats";
import type { Period } from "@/lib/stats";
import { Card } from "@/components/admin/stats/stats-view";
import { ColumnChart, InfoTip, Kpi, LineChart } from "@/components/admin/stats/charts";
import { Icon } from "@/components/icons";

/** «Statistika» sahifasidagi mobil ilova bo'limi (davr — sahifaning umumiy tanlovi). */
export async function MobileStatsSection({ period }: { period: Period }) {
  const m = await loadMobileStats(period);
  const labels = period.buckets.map((b) => b.label);
  const col = (pts: { values: number[] }[]) => pts.map((p) => p.values[0]);
  const per = period.unit === "month" ? "oylik" : period.unit === "hour" ? "soatlik" : "kunlik";
  const tiles: { label: string; value: number; info: string }[] = [
    { label: "Ilovadan foydalanganlar", value: m.totals.used, info: "Hozirgaça ilovaga kamida bir marta kirgan barça hisoblar." },
    { label: "Ilovada oçiq hisoblar", value: m.totals.open, info: "Hozir ilovada kirgan holatda turgan hisoblar: söngi 30 kunda ilovadan foydalangan va ilovadan çiqmagan." },
    { label: "Bugun", value: m.totals.dau, info: "Bugun (Toşkent vaqti) ilovani oçgan alohida odamlar." },
    { label: "Söngi 7 kun", value: m.totals.wau, info: "Söngi 7 kunda ilovani oçgan alohida odamlar (haftalik faol)." },
    { label: "Söngi 30 kun", value: m.totals.mau, info: "Söngi 30 kunda ilovani oçgan alohida odamlar (oylik faol)." },
  ];

  return (
    <div className="viz flex flex-col gap-5">
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-white/10 pt-6">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
            <Icon name="phone" className="h-5 w-5" /> Mobil ilova
          </h2>
          <p className="mt-0.5 text-sm text-zinc-500">{period.label} · faollik ilova yangilangandan beri yiğiladi</p>
        </div>
        <Link href="/stats/mobile" className="btn-ghost !px-3 !py-1.5 text-sm">
          Foydalanuvçilar röyxatlari ›
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {tiles.map((t) => (
          <div key={t.label} className="viz-card relative rounded-2xl p-4">
            <InfoTip text={t.info} />
            <span className="pr-6 text-sm" style={{ color: "var(--viz-muted)" }}>
              {t.label}
            </span>
            <p className="mt-1 text-2xl font-semibold" style={{ color: "var(--viz-text)" }}>
              {t.value.toLocaleString("ru-RU")}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Faol (ilovada)" {...m.kpi.active} spark={col(m.series.active)} info={["Davr içida ilovani kamida bir marta oçgan alohida odamlar.", "Bir odam kuniga 10 marta oçsa ham — 1 ta."]} />
        <Kpi label="Ilovaga yangi kelganlar" {...m.kpi.firsts} spark={col(m.series.firsts)} info={["Ilovani birinçi marta şu davrda işlatgan hisoblar (yangi va saytdan ötganlar).", "Ilova yangilanişidan oldingi foydalanuvçilar bu yerda sanalmaydi."]} />
        <Kpi label="Ilovada röyxatdan ötdi" {...m.kpi.signups} spark={col(m.series.signups)} info={["Hisobini to'g'ridan-to'g'ri ilovada yaratganlar (Google yoki email bilan)."]} />
        <Kpi label="Yuklab olişlar" {...m.kpi.downloads} spark={col(m.series.downloads)} info={["Saytdagi «Android uçun yuklab oliş» tugmasi bosilişlari (mehmonlar ham).", "Bir odam bir neça marta bossa — har biri sanaladi."]} />
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Ilovadagi faollik" icon="phone" sub={`Ilovani oçgan alohida odamlar — ${per}`} info={["Har nuqta — şu kun (yoki oy) ilovani kamida bir marta oçgan alohida foydalanuvçilar soni.", "1 kun tanlansa — odam şu kuni ilovani birinçi oçgan soati böyiça."]}>
          <LineChart labels={labels} series={[{ name: "Faol foydalanuvçilar", slot: 1, values: col(m.series.active) }]} />
        </Card>
        <Card title="Ilovaga kelganlar" icon="users" sub={`Yangi ilova foydalanuvçilari va yuklab olişlar — ${per}`} info={["Kök — ilovani birinçi marta işlatganlar, yaşil — ulardan ilovada hisob yaratganlar, sariq — saytdan yuklab oliş bosilişlari."]}>
          <ColumnChart
            labels={labels}
            stacked={false}
            series={[
              { name: "Ilovaga yangi kelgan", slot: 1, values: col(m.series.firsts) },
              { name: "Ilovada röyxatdan ötgan", slot: 3, values: col(m.series.signups) },
              { name: "Yuklab oliş", slot: 2, values: col(m.series.downloads) },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
