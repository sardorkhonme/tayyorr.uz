import Link from "next/link";

import { loadStats, RANGES } from "@/lib/stats";
import { ColumnChart, HBars, Heatmap, Kpi, LineChart } from "@/components/admin/stats/charts";
import { Icon, type IconName } from "@/components/icons";

const ORDER_STATUS: Record<string, string> = {
  OPEN: "Oçiq",
  IN_PROGRESS: "Bajarilmoqda",
  DELIVERED: "Topşirildi",
  DONE: "Yakunlandi",
  CANCELLED: "Bekor qilindi",
};
const ORDER_TYPE: Record<string, string> = {
  PRESENTATION: "Prezentatsiya",
  COURSE_WORK: "Kurs işi",
  REFERAT: "Referat",
  ESSAY: "Esse",
  DIPLOMA: "Diplom işi",
  OTHER: "Boşqa",
};
const SMM_STATUS: Record<string, string> = {
  PENDING: "Navbatda",
  PROCESSING: "Qabul qilindi",
  IN_PROGRESS: "Bajarilmoqda",
  COMPLETED: "Bajarildi",
  PARTIAL: "Qisman",
  CANCELED: "Bekor",
  FAILED: "Xatolik",
};
const PLATFORM: Record<string, string> = {
  instagram: "Instagram",
  telegram: "Telegram",
  tiktok: "TikTok",
  youtube: "YouTube",
  facebook: "Facebook",
  twitter: "X (Twitter)",
  other: "Boşqa",
};
const METHOD: Record<string, string> = { CLICK: "Click", PAYME: "Payme", ADMIN: "Admin", DEMO: "Demo" };
const ROLE: Record<string, string> = { ORDERER: "Buyurtmaçi", PREPARER: "Tayyorlovçi", NONE: "Tanlamagan" };

function Card({ title, icon, sub, children, className = "" }: { title: string; icon: IconName; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`viz-card min-w-0 rounded-2xl p-4 sm:p-5 ${className}`}>
      <h2 className="flex items-center gap-2 font-semibold" style={{ color: "var(--viz-text)" }}>
        <Icon name={icon} className="h-4 w-4 shrink-0" style={{ color: "var(--viz-1)" }} />
        {title}
      </h2>
      {sub && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--viz-muted)" }}>
          {sub}
        </p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Statistika sahifasining mazmuni (admin tekshiruvi — page.tsx da). */
export async function StatsView({ range }: { range: string }) {
  const s = await loadStats(range);
  const { labels, series: S, kpi } = s;
  const col = (pts: { values: number[] }[], i = 0) => pts.map((p) => p.values[i]);
  const per = s.unit === "month" ? "oylik" : "kunlik";

  return (
    <div className="viz flex flex-col gap-5">
      {/* sarlavha + davr tanlash */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Statistika</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Oxirgi {s.range.label} · Toşkent vaqti · KPI oldingi {s.range.label} bilan soliştirilgan
          </p>
        </div>
        <nav className="viz-card inline-flex rounded-xl p-1 text-sm">
          {RANGES.map((x) => {
            const active = x.key === s.range.key;
            return (
              <Link
                key={x.key}
                href={`/stats?r=${x.key}`}
                className="rounded-lg px-3 py-1.5 font-medium transition"
                style={active ? { background: "var(--viz-1)", color: "#fff" } : { color: "var(--viz-muted)" }}
              >
                {x.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="Yangi foydalanuvçilar" {...kpi.users} spark={col(S.users)} />
        <Kpi label="Faol foydalanuvçilar" {...kpi.active} hint="Saytga kirgan alohida foydalanuvçilar" />
        <Kpi label="Hamyon töldirildi" {...kpi.topup} f="som" spark={col(S.money, 0)} />
        <Kpi label="Sayt komissiyasi" {...kpi.commission} f="som" spark={col(S.money, 2)} />
        <Kpi label="SMM tuşum (sof)" {...kpi.smm} f="som" spark={col(S.smm, 1)} hint="Mijozlar tölagan, qaytarilganlar ayrilgan" />
        <Kpi label="Buyurtmalar" {...kpi.orders} spark={col(S.orders)} />
        <Kpi label="SMM buyurtmalar" {...kpi.smmOrders} spark={col(S.smm, 0)} />
        <Kpi label="Xabarlar" {...kpi.messages} spark={col(S.messages)} />
        <Kpi label="Kartaga yeçildi" {...kpi.payout} f="som" spark={col(S.money, 1)} />
      </div>

      {/* pul oqimi */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Pul oqimi" icon="coins" sub={`Hamyonga kirgan va kartaga çiqqan pul — ${per}`}>
          <LineChart
            labels={labels}
            f="som"
            series={[
              { name: "Töldiriş", slot: 1, values: col(S.money, 0) },
              { name: "Kartaga yeçiş", slot: 2, values: col(S.money, 1) },
            ]}
          />
        </Card>
        <Card title="Daromad" icon="chart" sub={`Sayt komissiyasi va SMM sof tuşumi — ${per}`}>
          <ColumnChart
            labels={labels}
            f="som"
            series={[
              { name: "Komissiya", slot: 1, values: col(S.money, 2) },
              { name: "SMM tuşum", slot: 3, values: col(S.smm, 1) },
            ]}
          />
        </Card>
      </div>

      {/* foydalanuvchilar */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Yangi foydalanuvçilar" icon="users" sub={`Röyxatdan ötganlar — ${per}`}>
          <ColumnChart labels={labels} series={[{ name: "Yangi foydalanuvçilar", slot: 1, values: col(S.users) }]} />
        </Card>
        <Card title="Tashriflar" icon="eye" sub={`Saytga kirişlar va alohida foydalanuvçilar — ${per}`}>
          <LineChart
            labels={labels}
            series={[
              { name: "Tashriflar", slot: 1, values: col(S.visits, 0) },
              { name: "Alohida foydalanuvçilar", slot: 3, values: col(S.visits, 1) },
            ]}
          />
        </Card>
      </div>

      {/* faollik vaqti */}
      <Card title="Qaysi vaqtda faol" icon="clock" sub="Hafta kuni × soat (Toşkent vaqti) — tashriflar va foydalanuvçi amallari">
        <Heatmap grid={s.heat} />
      </Card>

      {/* buyurtmalar */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Buyurtmalar" icon="package" sub={`tayyorr.uz buyurtmalari — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "Buyurtmalar", slot: 1, values: col(S.orders) }]} />
        </Card>
        <Card title="Buyurtma holati" icon="check" sub="Şu davrda berilganlar">
          <HBars items={s.orderStatus.map((x) => ({ label: ORDER_STATUS[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Buyurtma turlari" icon="file">
          <HBars items={s.orderType.map((x) => ({ label: ORDER_TYPE[x.key] ?? x.key, value: x.n }))} />
        </Card>
        <Card title="Xabarlar" icon="message" sub={`Foydalanuvçilar yozgan xabarlar — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "Xabarlar", slot: 1, values: col(S.messages) }]} />
        </Card>
      </div>

      {/* SMM */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="SMM buyurtmalar" icon="rocket" sub={`Buyurtmalar soni — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "SMM buyurtmalar", slot: 1, values: col(S.smm, 0) }]} />
        </Card>
        <Card title="SMM holati" icon="check">
          <HBars items={s.smmStatus.map((x) => ({ label: SMM_STATUS[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="SMM — platformalar" icon="rocket" sub="Sof tuşum böyiça">
          <HBars f="som" items={s.smmPlatform.map((x) => ({ label: PLATFORM[x.key] ?? x.key, value: x.net, extra: `${x.n} ta buyurtma` }))} />
        </Card>
        <Card title="Eng köp sotilgan SMM xizmatlari" icon="star" sub="Sof tuşum böyiça, top 8" className="lg:col-span-2">
          <HBars
            f="som"
            items={s.topServices.map((x) => ({
              label: x.name.replace(/[\p{Extended_Pictographic}\u{FE0F}]/gu, "").replace(/\s+/g, " ").trim(),
              value: x.net,
              extra: `${PLATFORM[x.platform] ?? x.platform} · ${x.n} ta buyurtma`,
            }))}
          />
        </Card>
      </div>

      {/* to'lov usullari va rollar */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Töldiriş usullari" icon="card" sub="Şu davrda hamyonga tuşgan summa">
          <HBars f="som" items={s.methods.map((x) => ({ label: METHOD[x.key] ?? x.key, value: x.sum, extra: `${x.n} ta tölov` }))} />
        </Card>
        <Card title="Foydalanuvçilar roli" icon="users" sub="Barça vaqt">
          <HBars items={s.roles.map((x) => ({ label: ROLE[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
    </div>
  );
}
