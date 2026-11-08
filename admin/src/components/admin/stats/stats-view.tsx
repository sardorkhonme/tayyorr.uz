import { loadDay, loadStats, todayTashkent, type Period } from "@/lib/stats";
import { DayPicker } from "@/components/admin/stats/day-picker";
import { PeriodPicker } from "@/components/admin/stats/period-picker";
import { ColumnChart, HBars, Heatmap, InfoTip, Kpi, LineChart } from "@/components/admin/stats/charts";
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

export function Card({ title, icon, sub, info, children, className = "" }: { title: string; icon: IconName; sub?: string; info: string[]; children: React.ReactNode; className?: string }) {
  return (
    <section className={`viz-card relative min-w-0 rounded-2xl p-4 sm:p-5 ${className}`}>
      <InfoTip text={info} className="sm:!right-4 sm:!top-4" />
      <h2 className="flex items-center gap-2 pr-8 font-semibold" style={{ color: "var(--viz-text)" }}>
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
export async function StatsView({ period, day: dayParam }: { period: Period; day?: string }) {
  const [s, day] = await Promise.all([loadStats(period), loadDay(dayParam)]);
  const { labels, series: S, kpi } = s;
  const col = (pts: { values: number[] }[], i = 0) => pts.map((p) => p.values[i]);
  const per = s.unit === "month" ? "oylik" : s.unit === "hour" ? "soatlik" : "kunlik";

  return (
    <div className="viz flex flex-col gap-5">
      {/* sarlavha + davr tanlash */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">Statistika</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {period.label} · Toşkent vaqti · KPI oldingi xuddi şunça davr bilan soliştirilgan
          </p>
        </div>
        <PeriodPicker active={period.key} fromDay={period.fromDay} toDay={period.toDay} today={todayTashkent()} />
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Kpi label="Yangi foydalanuvçilar" {...kpi.users} info={["Tanlangan davrda röyxatdan ötgan yangi hisoblar soni.", "Support va sayt komissiyasi kabi tizim hisoblari sanalmaydi."]} spark={col(S.users)} />
        <Kpi label="Faol foydalanuvçilar" {...kpi.active} info={["Davr içida saytga kamida bir marta kirgan alohida odamlar soni. Bir odam 10 marta kirsa ham — 1 ta.", "Faqat hisobiga kirgan (login qilgan) foydalanuvçilar sanaladi, mehmonlar kirmaydi."]} />
        <Kpi label="Hamyon töldirildi" {...kpi.topup} info={["Foydalanuvçilar hamyoniga muvaffaqiyatli tuşgan pul: Click, Payme va admin qöşgan summalar.", "Bekor qilingan (qaytarib olingan) tölovlar kirmaydi."]} f="som" spark={col(S.money, 0)} />
        <Kpi label="Sayt komissiyasi" {...kpi.commission} info={["Buyurtmalar (şartnomalar) yakunlanganda saytga ötgan komissiya (5% / 2%) yiğindisi.", "Bu — saytning şu davrdagi sof daromadi."]} f="som" spark={col(S.money, 2)} />
        <Kpi label="SMM tuşum (sof)" {...kpi.smm} info={["SMM buyurtmalar uçun mijozlar hamyonidan yeçilgan pul, qaytarilgan qismi (qisman bajarilgan / bekor bölgan) ayrilgan holda.", "«Xatolik» bölgan buyurtmalar kirmaydi.", "Diqqat: bu tuşum, foyda emas — provayderga tölangan xarajat ayrilmagan."]} f="som" spark={col(S.smm, 1)} />
        <Kpi label="Buyurtmalar" {...kpi.orders} info={["Tayyorr.uz (app) da berilgan ilmiy iş buyurtmalari soni: prezentatsiya, kurs işi, referat va boşqalar.", "Keyin öçirilgan buyurtmalar ham sanaladi."]} spark={col(S.orders)} />
        <Kpi label="SMM buyurtmalar" {...kpi.smmOrders} info={["smm.tayyorr.uz da berilgan barça buyurtmalar soni — holatidan qatʼi nazar (bajarilgan, jarayondagi, bekor va xatolik bölganlari ham)."]} spark={col(S.smm, 0)} />
        <Kpi label="Xabarlar" {...kpi.messages} info={["Foydalanuvçilar çatda yozgan xabarlar soni (support bilan yozişmalar ham).", "Avtomatik tizim xabarlari (bildirişnomalar) sanalmaydi."]} spark={col(S.messages)} />
        <Kpi label="Kartaga yeçildi" {...kpi.payout} info={["Foydalanuvçilar hamyonidan bank kartasiga muvaffaqiyatli yeçib olingan pul.", "Rad etilgan yoki bekor qilingan sörövlar kirmaydi."]} f="som" spark={col(S.money, 1)} />
      </div>

      {/* pul oqimi */}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card title="Pul oqimi" info={["Kök çiziq — hamyonlarga kirgan pul (töldiriş), töq sariq — bank kartasiga çiqqan pul (yeçib oliş).", "Ikkalasi bir xil şkalada. Çiziq ustiga sichqonçani olib boring (telefonda bosing) — şu kunning aniq summalari çiqadi.", "Kirgan pul çiqqandan köp bölsa — pul saytdagi hamyonlarda qolyapti."]} icon="coins" sub={`Hamyonga kirgan va kartaga çiqqan pul — ${per}`}>
          <LineChart
            labels={labels}
            f="som"
            series={[
              { name: "Töldiriş", slot: 1, values: col(S.money, 0) },
              { name: "Kartaga yeçiş", slot: 2, values: col(S.money, 1) },
            ]}
          />
        </Card>
        <Card title="Daromad" info={["Har ustun — şu kun (yoki oy) daromadi: kök — sayt komissiyasi, yaşil — SMM sof tuşumi. Ustun balandligi — ikkalasining yiğindisi.", "SMM tuşumdan provayder xarajati ayrilmagan. Har bir SMM buyurtmaning aniq foydasi — tayyorr+ → buyurtma sahifasida."]} icon="chart" sub={`Sayt komissiyasi va SMM sof tuşumi — ${per}`}>
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
        <Card title="Yangi foydalanuvçilar" info={["Har ustun — şu kun (1 yil tanlansa — oy) röyxatdan ötgan yangi hisoblar soni.", "Ustunni bosing yoki ustiga boring — aniq son çiqadi. Reklama yoki post qilingan kunlardagi ösişni şu yerda körasiz."]} icon="users" sub={`Röyxatdan ötganlar — ${per}`}>
          <ColumnChart labels={labels} series={[{ name: "Yangi foydalanuvçilar", slot: 1, values: col(S.users) }]} />
        </Card>
        <Card title="Tashriflar" info={["Kök — jami kirişlar: hisobiga kirgan foydalanuvçi brauzerni har yangi oçganda 1 ta kiriş sanaladi.", "Yaşil — şu kun kirgan alohida odamlar soni.", "Kök yaşildan ançagina baland bölsa — odamlar kuniga bir neça marta kiryapti (sayt ularga kerak)."]} icon="eye" sub={`Saytga kirişlar va alohida foydalanuvçilar — ${per}`}>
          <LineChart
            labels={labels}
            series={[
              { name: "Tashriflar", slot: 1, values: col(S.visits, 0) },
              { name: "Alohida foydalanuvçilar", slot: 3, values: col(S.visits, 1) },
            ]}
          />
        </Card>
      </div>

      {/* tanlangan kun — soatma-soat */}
      <section id="kunlik" className="viz-card relative min-w-0 scroll-mt-24 rounded-2xl p-4 sm:p-5">
        <InfoTip
          className="sm:!right-4 sm:!top-4"
          text={[
            "Tanlangan kunning har bir soatida saytda nima bölgani (Toşkent vaqti): ekran oçiş, bosiş va amallar (saqlaş, yuboriş, buyurtma ...) ustma-ust körsatiladi.",
            "Pastdagi çiziq — şu soatda saytda bölgan alohida odamlar soni (foydalanuvçilar va mehmonlar).",
            "Kalendardan yoki ← → tugmalari bilan istalgan kunni tanlang. Batafsil izlar oldingi kunlar uçun ham saqlanadi (Loglar böliminda).",
          ]}
        />
        <div className="flex flex-wrap items-start justify-between gap-3 pr-8">
          <div>
            <h2 className="flex items-center gap-2 font-semibold" style={{ color: "var(--viz-text)" }}>
              <Icon name="clock" className="h-4 w-4 shrink-0" style={{ color: "var(--viz-1)" }} />
              Kunlik faollik — soatma-soat
            </h2>
            <p className="mt-0.5 text-xs" style={{ color: "var(--viz-muted)" }}>
              {day.total.toLocaleString("ru-RU")} ta harakat · {day.people} ta odam
              {day.peak >= 0 && ` · eng faol soat: ${day.hours[day.peak].label}`}
            </p>
          </div>
          <DayPicker day={day.day} today={day.today} />
        </div>
        <div className="mt-4">
          <ColumnChart
            labels={day.hours.map((x) => x.label)}
            series={[
              { name: "Ekran oçiş", slot: 1, values: day.hours.map((x) => x.page) },
              { name: "Bosişlar", slot: 2, values: day.hours.map((x) => x.click) },
              { name: "Amallar", slot: 3, values: day.hours.map((x) => x.action) },
            ]}
          />
        </div>
        <div className="mt-5">
          <LineChart height={150} labels={day.hours.map((x) => x.label)} series={[{ name: "Alohida odamlar", slot: 1, values: day.hours.map((x) => x.people) }]} />
        </div>
      </section>

      {/* faollik vaqti */}
      <Card title="Qaysi vaqtda faol" info={["Har bir katak — hafta kuni va soat (Toşkent vaqti). Rang qança töq bölsa, şu vaqtda foydalanuvçilar şunça köp harakat qilgan: saytga kiriş, buyurtma, taklif, tölov va h.k.", "Katak ustiga boring — aniq son pastda çiqadi.", "Maslahat: ommaviy xabar, eʼlon yoki reklamani eng faol soatlarda yuboring."]} icon="clock" sub="Hafta kuni × soat (Toşkent vaqti) — tashriflar va foydalanuvçi amallari">
        <Heatmap grid={s.heat} />
      </Card>

      {/* buyurtmalar */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Buyurtmalar" icon="package" info={["Har ustun — şu kun (yoki oy) Tayyorr.uz da berilgan ilmiy iş buyurtmalari soni."]} sub={`tayyorr.uz buyurtmalari — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "Buyurtmalar", slot: 1, values: col(S.orders) }]} />
        </Card>
        <Card title="Buyurtma holati" info={["Şu davrda berilgan buyurtmalar hozir qaysi holatda:", "Oçiq — tayyorlovçilardan taklif kutilmoqda; Bajarilmoqda — tayyorlovçi tanlangan; Topşirildi — iş yuborilgan, buyurtmaçi tasdiğini kutmoqda; Yakunlandi — tugagan; Bekor qilindi."]} icon="check" sub="Şu davrda berilganlar">
          <HBars items={s.orderStatus.map((x) => ({ label: ORDER_STATUS[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Buyurtma turlari" info={["Şu davrda berilgan buyurtmalar qaysi turga tegişli: prezentatsiya, kurs işi, referat, esse, diplom yoki boşqa. Qaysi xizmatga talab köpligini körsatadi."]} icon="file">
          <HBars items={s.orderType.map((x) => ({ label: ORDER_TYPE[x.key] ?? x.key, value: x.n }))} />
        </Card>
        <Card title="Xabarlar" icon="message" info={["Har ustun — şu kun foydalanuvçilar yozgan çat xabarlari soni (support bilan ham). Avtomatik tizim xabarlari kirmaydi."]} sub={`Foydalanuvçilar yozgan xabarlar — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "Xabarlar", slot: 1, values: col(S.messages) }]} />
        </Card>
      </div>

      {/* SMM */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="SMM buyurtmalar" info={["Har ustun — şu kun (yoki oy) smm.tayyorr.uz da berilgan buyurtmalar soni, holatidan qatʼi nazar."]} icon="rocket" sub={`Buyurtmalar soni — ${per}`} className="lg:col-span-2">
          <ColumnChart labels={labels} series={[{ name: "SMM buyurtmalar", slot: 1, values: col(S.smm, 0) }]} />
        </Card>
        <Card title="SMM holati" info={["Şu davrdagi SMM buyurtmalar holati:", "Bajarildi — töliq yetkazildi; Qisman — bir qismi yetkazildi, qolganining puli qaytdi; Bekor — provayder bekor qildi, pul qaytdi; Xatolik — provayder qabul qilmadi, pul qaytdi; Qabul qilindi / Bajarilmoqda — hali jarayonda.", "«Xatolik» köp bölsa — provayder balansi yoki xizmat sozlamalarini tekşiring."]} icon="check">
          <HBars items={s.smmStatus.map((x) => ({ label: SMM_STATUS[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="SMM — platformalar" info={["Qaysi ijtimoiy tarmoq xizmatlari qança sof tuşum keltirgani (qaytarilganlar ayrilgan). Ostida — buyurtmalar soni.", "«Xatolik» bölgan buyurtmalar kirmaydi."]} icon="rocket" sub="Sof tuşum böyiça">
          <HBars f="som" items={s.smmPlatform.map((x) => ({ label: PLATFORM[x.key] ?? x.key, value: x.net, extra: `${x.n} ta buyurtma` }))} />
        </Card>
        <Card title="Eng köp sotilgan SMM xizmatlari" info={["Şu davrda eng köp sof tuşum keltirgan 8 ta SMM xizmati. Ostida — platforma va buyurtmalar soni.", "Qaysi xizmat ommabopligini körib, unga çegirma yoki reklama qiliş mumkin."]} icon="star" sub="Sof tuşum böyiça, top 8" className="lg:col-span-2">
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
        <Card title="Töldiriş usullari" info={["Hamyonga pul qaysi yöl bilan tuşgani: Click, Payme yoki Admin (admin qöl bilan qöşgan). Ostida — tölovlar soni.", "Faqat muvaffaqiyatli va bekor qilinmagan tölovlar."]} icon="card" sub="Şu davrda hamyonga tuşgan summa">
          <HBars f="som" items={s.methods.map((x) => ({ label: METHOD[x.key] ?? x.key, value: x.sum, extra: `${x.n} ta tölov` }))} />
        </Card>
        <Card title="Foydalanuvçilar roli" info={["Barça vaqt davomida röyxatdan ötganlar qaysi rolni tanlagani (davrga boğliq emas):", "Tayyorlovçi — iş bajaruvçi; Buyurtmaçi — iş buyuradigan; Tanlamagan — hisob oçgan, lekin rol tanlamagan (masalan, faqat SMM yoki tayyorr+ uçun kelgan)."]} icon="users" sub="Barça vaqt">
          <HBars items={s.roles.map((x) => ({ label: ROLE[x.key] ?? x.key, value: x.n }))} />
        </Card>
      </div>
    </div>
  );
}
