import Link from "next/link";

import { MarkGuideRead } from "@/components/guide-banner";
import { Icon, type IconName } from "@/components/icons";
import { SupportLink } from "@/components/support-link";

export const metadata = { title: "Qöllanma — Tayyorr SMM" };

/**
 * Qo'llanma: provayder xizmat nomlaridagi inglizcha yozuvlar (No Refill, Non-Drop, Instant Start ...)
 * nimani anglatishi va qaysi xizmatni tanlash tavsiya etilishi. Ochilgan zahoti "o'qildi" deb belgilanadi
 * (buyurtma sahifasidagi katta banner endi chiqmaydi).
 */

type Tone = "good" | "ok" | "bad" | "info";
type Term = { names: string[]; title: string; text: string; tone: Tone };
type Section = { id: string; icon: IconName; title: string; lead: string; terms: Term[]; note?: string };

const TONE: Record<Tone, { dot: string; label: string; cls: string }> = {
  good: { dot: "bg-emerald-500", label: "Tavsiya", cls: "bg-emerald-50 text-emerald-700" },
  ok: { dot: "bg-sky-500", label: "Yaxşi", cls: "bg-sky-50 text-sky-700" },
  bad: { dot: "bg-amber-500", label: "Ehtiyot böling", cls: "bg-amber-50 text-amber-800" },
  info: { dot: "bg-zinc-400", label: "Maʼlumot", cls: "bg-zinc-100 text-zinc-600" },
};

const RULES = [
  { icon: "♻️", text: "Obunaçi va aʼzo uçun faqat kafolatli (♻️) xizmatni tanlang." },
  { icon: "🧪", text: "Yangi xizmatni avval kiçik miqdorda (100–200 ta) sinab köring." },
  { icon: "🔓", text: "Sahifa yoki kanal oçiq bölsin, buyurtma tugaguncha nomini özgartirmang." },
  { icon: "1️⃣", text: "Bitta havolaga bir vaqtda faqat bitta buyurtma bering." },
  { icon: "💡", text: "Eng arzoni — har doim eng yaxşisi emas: kafolat, tezlik va sifatga qarang." },
];

const SECTIONS: Section[] = [
  {
    id: "kafolat",
    icon: "shield",
    title: "Kafolat (Refill) va kamayiş (Drop)",
    lead:
      "Eng muhim bölim. Instagram, TikTok va Telegram vaqti-vaqti bilan soxta va faol bölmagan akkauntlarni öçirib turadi — şunda obunaçi, layk yoki aʼzolar soni kamayadi. Buni «drop» (tuşiş) deyişadi. Kafolatli xizmatda kamaygan qismi qayta töldiriladi, kafolatsizda — yöq.",
    terms: [
      {
        names: ["No Refill", "No-Refill"],
        title: "Kafolatsiz",
        text:
          "Kamaysa qayta töldirilmaydi. Arzon, lekin obunaçilar bir neça kun yoki hafta içida tuşib ketişi mumkin — bazan deyarli hammasi. Bizda «⚠️ Kafolatsiz» deb körsatiladi. Körişlar uçun muammo emas, obunaçi uçun tavsiya etilmaydi.",
        tone: "bad",
      },
      {
        names: ["Refill: 30 Days", "30 Days Refill", "Refill: 365 Days"],
        title: "N kun kafolat",
        text:
          "Şu kunlar içida kamaysa, provayder bepul qayta töldiradi. Qança uzoq bölsa — şunça yaxşi. Bizda «♻️ 30 kun kafolat» kabi körsatiladi.",
        tone: "good",
      },
      {
        names: ["Lifetime Refill", "Lifetime Guaranteed"],
        title: "Umrbod kafolat",
        text: "Kamaysa, muddat çegarasiz qayta töldiriladi (xizmat işlab turgan ekan). Obunaçi uçun eng işonçli tanlov.",
        tone: "good",
      },
      {
        names: ["Refill Button"],
        title: "Qayta töldiriş tugmasi",
        text: "Kamayganda qayta töldirişni söraş mumkin. Hozirça buning uçun supportga buyurtma raqami bilan yozasiz — biz provayderdan söraymiz.",
        tone: "good",
      },
      {
        names: ["Non-Drop", "Non Drop", "Drop: ~0%"],
        title: "Deyarli kamaymaydi",
        text: "Provayder bu akkauntlar deyarli öçirilmaydi deydi. Bu yaxşi belgi, lekin 100% vaʼda emas — kafolat bilan birga bölsa, eng yaxşisi.",
        tone: "good",
      },
      {
        names: ["Low Drop", "Low-Drop"],
        title: "Kam kamayadi",
        text: "Biroz tuşişi mumkin, lekin köp emas. Layk va körişlar uçun yetarli; obunaçi uçun kafolat ham bölsin.",
        tone: "ok",
      },
      {
        names: ["Drop: 45-60%", "Drop 20%"],
        title: "Kutilgan kamayiş foizi",
        text: "Provayder oldindan aytyapti: şunça foizi tuşib ketadi. Masalan 1000 ta olsangiz, 400–550 tasi qolişi mumkin. Kafolatsiz bölsa — tanlamang.",
        tone: "bad",
      },
      {
        names: ["Stable", "100% Stable"],
        title: "Barqaror",
        text: "Provayder fikriça kamayiş juda oz. «Non-Drop» bilan deyarli bir xil maʼno.",
        tone: "ok",
      },
    ],
    note:
      "Xizmat kartasida yaşil «♻️ … kafolat» yoki sariq «⚠️ Kafolatsiz» yorliği turadi — inglizça yozuvni öqişingiz şart emas, şu yorliqqa qarang.",
  },
  {
    id: "tezlik",
    icon: "bolt",
    title: "Tezlik va boşlaniş",
    lead: "Buyurtma qaçon boşlanişi va qança tez yetkazilişi. Bu vaqtlar taxminiy — provayder band bölsa, sekinroq böliši mumkin.",
    terms: [
      {
        names: ["Instant", "Instant Start", "Start: INSTANT"],
        title: "Darhol boşlanadi",
        text: "Odatda buyurtmadan keyin bir neça daqiqa içida boşlanadi.",
        tone: "good",
      },
      {
        names: ["Start: 0-1H", "Start Time: 0-5 Min"],
        title: "Boşlaniş vaqti",
        text: "Buyurtma şu oraliq içida boşlanadi: H — soat, Min — daqiqa. «0-1H» — bir soatgaça.",
        tone: "info",
      },
      {
        names: ["Speed: 50K/Day", "Speed: 5K/Hour"],
        title: "Tezlik",
        text: "Bir kunda (Day) yoki soatda (Hour) taxminan qança yetkazilişi. K — ming: 50K = 50 000 ta.",
        tone: "info",
      },
      {
        names: ["Super Fast", "Very Instant"],
        title: "Juda tez",
        text: "Tez yetkaziladi. Obunaçi uçun juda tez öciş baʼzan Instagram eʼtiborini tortadi — katta miqdorni bölib bergan maʼqul.",
        tone: "ok",
      },
      {
        names: ["Slow", "Gradual"],
        title: "Sekin, bosqiçma-bosqiç",
        text: "Asta-sekin yetkaziladi — tabiiyroq körinadi va kamroq tuşadi. Şoşilmasangiz yaxşi tanlov.",
        tone: "ok",
      },
      {
        names: ["Extra Delivery"],
        title: "Ortiqça yetkaziladi",
        text: "Keyingi kamayişni qoplaş uçun biroz köproq yuboriladi.",
        tone: "ok",
      },
    ],
  },
  {
    id: "sifat",
    icon: "sparkles",
    title: "Akkauntlar sifati",
    lead:
      "Obunaçi, layk va izohlar qanday akkauntlardan kelişi. Esda tuting: bular — sonni oşiriş xizmatlari. Ular sizning mahsulotingizni sotib olmaydi va postlaringizni muntazam kuzatmaydi.",
    terms: [
      {
        names: ["Real", "Real Accounts", "100% Real"],
        title: "Haqiqiy körinişdagi akkauntlar",
        text: "Rasmi, postlari bor, tirik odamga öxşaydigan profillar. Kamroq öçiriladi va sahifangizda tabiiyroq körinadi.",
        tone: "good",
      },
      {
        names: ["HQ", "High Quality", "HQ Profiles"],
        title: "Sifatli profillar",
        text: "Töliq tözdirilgan (rasm, ism, postlar) profillar. Botlardan yaxşiroq.",
        tone: "ok",
      },
      {
        names: ["Old Accounts", "Premium Accounts"],
        title: "Eski / premium akkauntlar",
        text: "Ançadan beri mavjud akkauntlar — Instagram ularni kamroq öçiradi.",
        tone: "ok",
      },
      {
        names: ["MIX", "Mix Premium"],
        title: "Aralaş",
        text: "Har xil sifatdagi akkauntlar aralaşmasi.",
        tone: "info",
      },
      {
        names: ["Bot", "Bot Mix"],
        title: "Bot akkauntlar",
        text: "Eng arzon, lekin eng köp öçiriladi va sahifada soxta körinadi. Obunaçi uçun tavsiya etilmaydi.",
        tone: "bad",
      },
    ],
  },
  {
    id: "davlat",
    icon: "users",
    title: "Davlat va auditoriya",
    lead: "Akkauntlar qaysi davlatdan ekanligi. Instagram statistikangizda auditoriya şu davlat bölib körinadi.",
    terms: [
      {
        names: ["Worldwide", "WW", "Global"],
        title: "Turli davlatlar",
        text: "Butun dunyodan aralaş akkauntlar. Eng keng tarqalgan tur.",
        tone: "info",
      },
      {
        names: ["Indian", "Brazil", "USA", "Turkey", "Arab"],
        title: "Bitta davlat",
        text: "Faqat şu davlat akkauntlari. Son oşadi, lekin ular özbekça kontentni tuşunmaydi — faqat sonni oşiriş kerak bölsa tanlang.",
        tone: "info",
      },
      {
        names: ["Only Indonesia Link", "Only Thailand Link"],
        title: "Faqat şu davlat havolasi uçun",
        text: "Bu xizmat FAQAT şu davlatdagi sahifa/post uçun işlaydi. Boşqa havolaga bersangiz, bajarilmaydi.",
        tone: "bad",
      },
    ],
  },
  {
    id: "boshqa",
    icon: "grid",
    title: "Boşqa yozuvlar",
    lead: "Xizmat nomlarida tez-tez uçraydigan qolgan belgilar.",
    terms: [
      {
        names: ["Recommend", "Best", "Very Stable", "Cheapest"],
        title: "Provayderning öz reklamasi",
        text:
          "Bu sözlar — provayderning maqtovi, kafolat emas. Masalan, «Recommend» deb yozilgan xizmatning nomida «Drop: 45-60%» va «No Refill» ham turişi mumkin. Har doim kafolat yorliğiga qarang.",
        tone: "bad",
      },
      {
        names: ["Cancel Button", "Cancel Enable"],
        title: "Bekor qiliş mumkin",
        text: "Buyurtma juda sekin ketsa, bekor qilib, bajarilmagan qism pulini qaytariş mumkin. Buning uçun supportga yozing.",
        tone: "good",
      },
      {
        names: ["Min 100", "Max 100K", "Unlimited"],
        title: "Miqdor çegarasi",
        text: "Bir buyurtmada eng kam (Min) va eng köp (Max) miqdor. Unlimited — çeksiz. Kartada «100 – 300 000 ta» deb ham körsatilgan.",
        tone: "info",
      },
      {
        names: ["All Link"],
        title: "Barça havolalar",
        text: "Post, Reels, video — har qanday havola turiga işlaydi.",
        tone: "info",
      },
      {
        names: ["Last 5 Post"],
        title: "Oxirgi N ta postga",
        text: "Profil havolasini berasiz — xizmat oxirgi N ta postga bölib yetkaziladi.",
        tone: "info",
      },
      {
        names: ["Random Comments", "Custom Comments"],
        title: "Izoh turi",
        text: "Random — matni tasodifiy (siz tanlay olmaysiz). Custom — matnni özingiz yozasiz.",
        tone: "info",
      },
      {
        names: ["Concurrent", "60 Minutes", "Stay time"],
        title: "Jonli efir tomoşabinlari",
        text: "Efir davomida körsatilgan vaqt turadigan tomoşabinlar. Faqat efir boşlangandan keyin buyurtma bering.",
        tone: "info",
      },
      {
        names: ["Love", "Wow", "Haha", "Sad", "Angry"],
        title: "Reaksiya turi",
        text: "Qaysi reaksiya qöyilişi (Facebook, Telegram va boşqalar uçun).",
        tone: "info",
      },
      {
        names: ["Social Ads", "Native Ads", "Discovery"],
        title: "Körişlar manbai",
        text: "YouTube körişlari qayerdan kelişi: reklama, tavsiyalar va hokazo.",
        tone: "info",
      },
    ],
  },
];

const PICKS: { icon: IconName; kind: string; good: string; avoid: string }[] = [
  {
    icon: "users",
    kind: "Obunaçilar / aʼzolar",
    good: "♻️ 30+ kun yoki umrbod kafolat, «Non-Drop» yoki «Low Drop», «Real» / «HQ» / «Old Accounts».",
    avoid: "«No Refill», «Bot», «Drop: 40–60%».",
  },
  {
    icon: "heart",
    kind: "Layk va reaksiyalar",
    good: "«Low Drop» yoki «Non-Drop» yetarli; kafolat bölsa — yana yaxşi.",
    avoid: "Juda arzon «Bot» layklar tez tuşadi.",
  },
  {
    icon: "eye",
    kind: "Körişlar",
    good: "Körişlar deyarli kamaymaydi — arzonlari ham yaxşi işlaydi. Kerakli tezlikni tanlang.",
    avoid: "Boşqa davlatga möljallangan («Only … Link») xizmatlar.",
  },
  {
    icon: "message",
    kind: "Izohlar",
    good: "Matn muhim bölsa — «Custom». Faqat jonlantiriş uçun — «Random».",
    avoid: "Random izohlar baʼzan mavzuga mos kelmaydi.",
  },
];

const CHECKLIST = [
  "Sahifa, profil yoki kanal oçiq (public) — yopiq akkauntga buyurtma bajarilmaydi.",
  "Havola turi töğri: obunaçi — profil yoki kanal havolasi; layk, köriş, izoh — post yoki video havolasi.",
  "Şu havolaga hali tugallanmagan boşqa buyurtma yöq.",
  "Buyurtma tugaguncha username'ni özgartirmaysiz va postni öçirmaysiz.",
  "Yangi xizmatni avval kiçik miqdorda sinab kördingiz.",
];

function TermRow({ t }: { t: Term }) {
  const tone = TONE[t.tone];
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] sm:gap-5">
      <div className="flex flex-wrap content-start gap-1.5">
        {t.names.map((n) => (
          <code key={n} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 font-mono text-[12.5px] text-zinc-800">
            {n}
          </code>
        ))}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-zinc-900">{t.title}</p>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.cls}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
            {tone.label}
          </span>
        </div>
        <p className="mt-1 text-[15px] leading-relaxed text-zinc-600">{t.text}</p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <MarkGuideRead />

      <header className="animate-rise flex items-center gap-4">
        <span className="shine grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <Icon name="book" className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Qöllanma</h1>
          <p className="mt-1 text-zinc-500">Xizmat nomlaridagi yozuvlar nimani anglatadi va qaysi xizmatni tanlaş kerak.</p>
        </div>
      </header>

      {/* qisqacha qoidalar */}
      <section className="card !rounded-3xl bg-gradient-to-br from-indigo-50/70 via-white to-fuchsia-50/60 p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">Qisqaça: 5 ta qoida</h2>
        <ol className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {RULES.map((r, i) => (
            <li key={i} className={`flex items-start gap-3 rounded-2xl bg-white/80 p-3.5 ring-1 ring-zinc-100 ${i === RULES.length - 1 ? "sm:col-span-2" : ""}`}>
              <span className="text-xl leading-6">{r.icon}</span>
              <span className="text-[15px] leading-relaxed text-zinc-700">{r.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* mundarija */}
      <nav className="flex flex-wrap gap-2 text-sm">
        {[...SECTIONS.map((s) => ({ id: s.id, title: s.title, icon: s.icon })), { id: "tavsiya", title: "Nimani tanlaş kerak", icon: "check" as IconName }, { id: "tekshiruv", title: "Buyurtmadan oldin", icon: "search" as IconName }, { id: "muammo", title: "Muammo bölsa", icon: "headset" as IconName }].map((s) => (
          <a key={s.id} href={`#${s.id}`} className="nav-item inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3.5 py-2 font-medium text-zinc-600">
            <Icon name={s.icon} className="h-4 w-4 text-indigo-500" />
            {s.title}
          </a>
        ))}
      </nav>

      {SECTIONS.map((s) => (
        <section key={s.id} id={s.id} className="card scroll-mt-24 !rounded-3xl p-5 sm:p-7">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <h2 className="font-display text-xl font-bold text-zinc-900 sm:text-2xl">{s.title}</h2>
          </div>
          <p className="mt-3 leading-relaxed text-zinc-600">{s.lead}</p>
          <div className="mt-2 divide-y divide-zinc-100">
            {s.terms.map((t) => (
              <TermRow key={t.title} t={t} />
            ))}
          </div>
          {s.note && (
            <p className="mt-3 flex gap-2.5 rounded-2xl bg-indigo-50 p-3.5 text-sm leading-relaxed text-indigo-900">
              <Icon name="sparkles" className="mt-0.5 h-4 w-4 shrink-0" />
              {s.note}
            </p>
          )}
        </section>
      ))}

      {/* tavsiya */}
      <section id="tavsiya" className="scroll-mt-24">
        <h2 className="font-display text-2xl font-bold text-zinc-900">Qaysi xizmatni tanlaş tavsiya etiladi</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {PICKS.map((p) => (
            <div key={p.kind} className="card min-w-0 !rounded-3xl p-5">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                  <Icon name={p.icon} className="h-[18px] w-[18px]" />
                </span>
                <p className="font-display text-lg font-bold text-zinc-900">{p.kind}</p>
              </div>
              <p className="mt-3 flex gap-2 text-[15px] leading-relaxed text-zinc-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600">
                  <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                {p.good}
              </p>
              <p className="mt-2 flex gap-2 text-[15px] leading-relaxed text-zinc-700">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-600">
                  <Icon name="close" className="h-3.5 w-3.5" strokeWidth={2.6} />
                </span>
                {p.avoid}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* buyurtmadan oldin */}
      <section id="tekshiruv" className="card scroll-mt-24 !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900 sm:text-2xl">Buyurtma berişdan oldin tekşiring</h2>
        <ul className="mt-4 space-y-3">
          {CHECKLIST.map((c) => (
            <li key={c} className="flex gap-3 text-[15px] leading-relaxed text-zinc-700">
              <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon name="check" className="h-4 w-4" strokeWidth={2.4} />
              </span>
              {c}
            </li>
          ))}
        </ul>
      </section>

      {/* muammo bo'lsa */}
      <section id="muammo" className="card scroll-mt-24 !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900 sm:text-2xl">Muammo bölsa</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { t: "Bajarilmadi yoki bekor böldi", d: "Pul töliq hamyoningizga avtomatik qaytadi." },
            { t: "Qisman bajarildi", d: "Bajarilmagan qismining puli avtomatik qaytadi." },
            { t: "Kafolatli xizmatda kamaydi", d: "Kafolat muddati içida supportga buyurtma raqami bilan yozing — qayta töldirişni söraymiz." },
            { t: "Kafolatsiz xizmatda kamaydi", d: "Afsuski, qayta töldirilmaydi va pul qaytmaydi. Şuning uçun obunaçiga kafolatlisini tanlang." },
            { t: "Uzoq vaqt boşlanmayapti", d: "Buyurtma sahifasida «Yangilaş» tugmasini bosing. 24 soatdan oşsa — supportga yozing." },
            { t: "Havolani xato kiritdim", d: "Darhol supportga yozing — iloji bölsa bekor qilamiz." },
          ].map((x) => (
            <div key={x.t} className="rounded-2xl bg-zinc-50 p-4">
              <p className="font-semibold text-zinc-900">{x.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-zinc-600">{x.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Link href="/" className="btn-primary flex-1 !py-3.5">
            Xizmatlarni tanlaş
            <Icon name="arrow-right" className="h-4 w-4" />
          </Link>
          <SupportLink className="btn-ghost flex-1 !py-3.5">
            <Icon name="headset" className="h-4 w-4" />
            Supportga yoziş
          </SupportLink>
        </div>
      </section>
    </div>
  );
}
