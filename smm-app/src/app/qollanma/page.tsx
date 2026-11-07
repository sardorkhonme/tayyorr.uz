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
type Section = { id: string; icon: IconName; title: string; lead: string; terms: Term[] };

const TONE: Record<Tone, { dot: string; label: string; cls: string }> = {
  good: { dot: "bg-emerald-500", label: "Tavsiya", cls: "bg-emerald-50 text-emerald-700" },
  ok: { dot: "bg-sky-500", label: "Yaxşi", cls: "bg-sky-50 text-sky-700" },
  bad: { dot: "bg-amber-500", label: "Ehtiyot böling", cls: "bg-amber-50 text-amber-800" },
  info: { dot: "bg-zinc-400", label: "Maʼlumot", cls: "bg-zinc-100 text-zinc-600" },
};

const RULES = [
  { icon: "♻️", text: "Obunaçi va aʼzo uçun faqat yaşil ♻️ kafolatli xizmatni oling." },
  { icon: "🔓", text: "Sahifa oçiq bölsin, buyurtma tugaguncha username'ni özgartirmang." },
  { icon: "🧪", text: "Yangi xizmatni avval kiçik miqdorda sinab köring." },
];

const SECTIONS: Section[] = [
  {
    id: "kafolat",
    icon: "shield",
    title: "Kafolat (Refill) va kamayiş (Drop)",
    lead:
      "Instagram, TikTok va Telegram vaqti-vaqti bilan soxta va faol bölmagan akkauntlarni öçirib turadi — şunda obunaçi, layk yoki aʼzolar soni kamayadi. Buni «drop» (tuşiş) deyişadi. Kafolatli xizmatda kamaygan qismi qayta töldiriladi, kafolatsizda — yöq.",
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

const PICKS: { icon: IconName; kind: string; text: string }[] = [
  { icon: "users", kind: "Obunaçi", text: "faqat ♻️ kafolatli" },
  { icon: "heart", kind: "Layk", text: "«Low Drop» / «Non-Drop» yetarli" },
  { icon: "eye", kind: "Köriş", text: "arzoni ham bölaveradi" },
  { icon: "message", kind: "Izoh", text: "matn kerak bölsa — «Custom»" },
];

function TermRow({ t }: { t: Term }) {
  const tone = TONE[t.tone];
  return (
    <div className="grid gap-2 py-3.5 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] sm:gap-5">
      <div className="flex flex-wrap content-start gap-1.5">
        {t.names.map((n) => (
          <code key={n} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-0.5 font-mono text-[12px] text-zinc-800">
            {n}
          </code>
        ))}
      </div>
      <div className="min-w-0">
        <p className="flex items-center gap-2 font-semibold text-zinc-900">
          <span className={`h-2 w-2 shrink-0 rounded-full ${tone.dot}`} title={tone.label} />
          {t.title}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed text-zinc-600">{t.text}</p>
      </div>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <MarkGuideRead />

      <header className="animate-rise flex items-center gap-4">
        <span className="shine grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30">
          <Icon name="book" className="h-7 w-7" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Qöllanma</h1>
          <p className="mt-1 text-zinc-500">1 daqiqada öqiladi</p>
        </div>
      </header>

      {/* eng asosiysi — yorliqqa qarash */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">Faqat şu yorliqqa qarang</h2>
        <p className="mt-1 text-sm text-zinc-500">Har bir xizmat kartasida bittasi turadi.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-emerald-700">♻️ 30 kun kafolat</span>
            <p className="mt-2.5 text-[15px] leading-relaxed text-emerald-900">
              Kamaysa — <b>qayta töldiriladi</b>. Obunaçi uçun şunisini oling.
            </p>
          </div>
          <div className="rounded-2xl bg-amber-50 p-4 ring-1 ring-amber-100">
            <span className="inline-flex rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-amber-700">⚠️ Kafolatsiz</span>
            <p className="mt-2.5 text-[15px] leading-relaxed text-amber-900">
              Arzon, lekin obunaçilar <b>tuşib ketişi mumkin</b> va qaytmaydi.
            </p>
          </div>
        </div>
      </section>

      {/* 3 qoida */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">3 ta qoida</h2>
        <ol className="mt-3 space-y-2.5">
          {RULES.map((r) => (
            <li key={r.text} className="flex items-start gap-3 text-[15px] leading-relaxed text-zinc-700">
              <span className="text-lg leading-6">{r.icon}</span>
              {r.text}
            </li>
          ))}
        </ol>
      </section>

      {/* nimani olish */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {PICKS.map((p) => (
          <div key={p.kind} className="card min-w-0 !rounded-2xl p-4">
            <span className="flex items-center gap-2 font-semibold text-zinc-900">
              <Icon name={p.icon} className="h-4 w-4 shrink-0 text-indigo-500" />
              {p.kind}
            </span>
            <p className="mt-1 text-sm leading-snug text-zinc-600">{p.text}</p>
          </div>
        ))}
      </section>

      {/* muammo bo'lsa */}
      <section className="card !rounded-3xl p-5 sm:p-7">
        <h2 className="font-display text-xl font-bold text-zinc-900">Muammo bölsa</h2>
        <ul className="mt-3 space-y-2 text-[15px] leading-relaxed text-zinc-700">
          <li>💸 Bajarilmasa yoki qisman bajarilsa — pul <b>avtomatik qaytadi</b>.</li>
          <li>♻️ Kafolatli xizmatda kamaysa — supportga buyurtma raqami bilan yozing.</li>
          <li>⏳ Uzoq boşlanmasa — buyurtma sahifasida «Yangilaş»ni bosing.</li>
        </ul>
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

      {/* batafsil — yopiq, xohlagan odam ochadi */}
      <section>
        <h2 className="font-display text-xl font-bold text-zinc-900">Atamalar luğati</h2>
        <p className="mt-1 text-sm text-zinc-500">Xizmat nomidagi inglizça yozuvlar — kerak bölsa oçib öqing.</p>
        <div className="card mt-4 divide-y divide-zinc-100 !rounded-3xl">
          {SECTIONS.map((s) => (
            <details key={s.id} id={s.id} className="group scroll-mt-24 px-5 py-4 sm:px-6">
              <summary className="flex cursor-pointer list-none items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon name={s.icon} className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-zinc-900">{s.title}</span>
                  <span className="block truncate text-xs text-zinc-500">
                    {s.terms.flatMap((t) => t.names[0]).join(", ")}
                  </span>
                </span>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg text-zinc-500 transition group-open:rotate-45 group-open:bg-indigo-100 group-open:text-indigo-600">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{s.lead}</p>
              <div className="divide-y divide-zinc-100">
                {s.terms.map((t) => (
                  <TermRow key={t.title} t={t} />
                ))}
              </div>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
