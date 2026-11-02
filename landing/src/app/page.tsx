import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { APP_URL, PLUS_URL, SMM_URL, START_URL } from "@/lib/links";

const SERVICES = [
  {
    mark: "/logo-mark.png",
    title: "Ilmiy ishlar",
    domain: "app.tayyorr.uz",
    href: `${APP_URL}/dashboard`,
    glow: "rgba(56, 189, 248, 0.22)",
    text: "Prezentatsiya, kurs ishi, referat va diplom ishi uchun ishonchli tayyorlovchi toping — yoki o'zingiz tayyorlab daromad qiling.",
    points: ["Takliflardan narx va reyting bo'yicha tanlaysiz", "Pul ish yakunlanguncha himoyada turadi"],
  },
  {
    mark: "/smm-mark.png",
    title: "Tayyorr SMM",
    domain: "smm.tayyorr.uz",
    href: SMM_URL,
    glow: "rgba(217, 70, 239, 0.22)",
    text: "Instagram, Telegram, TikTok va YouTube uchun obunachi, layk va ko'rishlar — buyurtma bir necha daqiqada avtomatik boshlanadi.",
    points: ["Bajarilmasa — pul avtomatik qaytadi", "Parol so'ralmaydi, faqat havola"],
  },
  {
    mark: "/plus-mark.png",
    title: "tayyorr+",
    domain: "plus.tayyorr.uz",
    href: PLUS_URL,
    glow: "rgba(139, 92, 246, 0.25)",
    text: "Barcha xizmatlarning boshqaruv paneli: bitta hisob, umumiy hamyon va yordam. Yangi xizmatlar ham shu yerda paydo bo'ladi.",
    points: ["Bir marta kirasiz — hamma joyda kirgansiz", "Hamyon barcha xizmatlarda umumiy"],
  },
];

const STEPS = [
  { n: "01", title: "Ro'yxatdan o'ting", text: "Google orqali bir daqiqada — tayyorr+ da bitta hisob ochasiz." },
  { n: "02", title: "Hamyonni to'ldiring", text: "Click orqali. Balans barcha xizmatlarda bir xil ishlaydi." },
  { n: "03", title: "Xizmatni tanlang", text: "Ilmiy ish buyurtma qiling yoki SMM xizmatini ishga tushiring." },
];

const FEATURES = [
  { title: "Bitta hisob", text: "Har bir xizmat uchun alohida ro'yxatdan o'tish shart emas." },
  { title: "Umumiy hamyon", text: "Bir marta to'ldirasiz — hamma xizmatda ishlatasiz." },
  { title: "Xavfsiz to'lov", text: "Click orqali; bajarilmagan ish uchun pul qaytariladi." },
  { title: "Tezkor yordam", text: "Savol bo'lsa — sayt ichidagi chat orqali yozing." },
];

const FAQ = [
  {
    q: "Har bir xizmat uchun alohida ro'yxatdan o'tishim kerakmi?",
    a: "Yo'q. tayyorr+ da bir marta ro'yxatdan o'tasiz — shu hisob bilan barcha xizmatlarga avtomatik kirasiz.",
  },
  {
    q: "Hamyon qanday ishlaydi?",
    a: "Hamyon bitta: Click orqali to'ldirasiz va balansni istalgan xizmatda ishlatasiz. Pulni kartaga yechib olish ham mumkin.",
  },
  {
    q: "Xizmat bajarilmasa nima bo'ladi?",
    a: "SMM buyurtmasi bajarilmasa yoki qisman bajarilsa — pul hamyonga avtomatik qaytadi. Ilmiy ishlarda pul ish qabul qilingunga qadar himoyada turadi.",
  },
  {
    q: "Mobil ilova bormi?",
    a: "Ha, Android uchun ilova bor — pastdagi tugma orqali yuklab oling. iOS versiyasi tez orada.",
  },
];

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      {/* fon */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60rem]">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-sky-500/15 blur-3xl" />
        <div className="absolute -right-40 top-10 h-[34rem] w-[34rem] rounded-full bg-fuchsia-600/15 blur-3xl" />
        <div className="absolute left-1/2 top-60 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-indigo-600/15 blur-3xl" />
      </div>

      <SiteHeader />

      {/* ---------- hero ---------- */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-6 pb-24 pt-36 lg:grid-cols-[1.1fr_1fr] lg:pt-44">
        <div className="text-center lg:text-left">
          <p className="animate-rise inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Ilmiy ishlar · SMM · tayyorr+
          </p>
          <h1
            className="animate-rise mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
            style={{ animationDelay: "60ms" }}
          >
            Bitta hisob.
            <br />
            <span className="text-brand">Hamma xizmatlar.</span>
          </h1>
          <p
            className="animate-rise mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400 lg:mx-0"
            style={{ animationDelay: "120ms" }}
          >
            Ilmiy ishlaringiz uchun tayyorlovchi toping, ijtimoiy tarmoqlaringizni o&apos;stiring — barchasi bitta
            hisob va bitta hamyon bilan.
          </p>
          <div
            className="animate-rise mt-9 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start"
            style={{ animationDelay: "180ms" }}
          >
            <a href={START_URL} className="btn-white !px-7 !py-3.5">
              Bepul boshlash <span aria-hidden>→</span>
            </a>
            <a href="#xizmatlar" className="btn-ghost !px-7 !py-3.5">
              Xizmatlarni ko&apos;rish
            </a>
          </div>
        </div>

        <HeroOrbit />
      </section>

      {/* ---------- xizmatlar ---------- */}
      <section id="xizmatlar" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20">
        <Heading kicker="Xizmatlar" title="Kerakli hamma narsa — bir joyda" />
        <div className="mt-14 grid gap-5 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <a
              key={s.title}
              href={s.href}
              style={{ "--glow": s.glow } as React.CSSProperties}
              className="card service-card group flex flex-col p-7"
            >
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-white shadow-lg shadow-black/40">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.mark} alt="" className="h-11 w-11 object-contain" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-bold text-white">{s.title}</h3>
              <p className="mt-1 text-xs text-zinc-500">{s.domain}</p>
              <p className="mt-4 leading-relaxed text-zinc-400">{s.text}</p>
              <ul className="mt-5 space-y-2.5">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2.5 text-sm text-zinc-300">
                    <Check />
                    {p}
                  </li>
                ))}
              </ul>
              <span className="mt-auto inline-flex items-center gap-1.5 pt-7 text-sm font-semibold text-white transition-[gap] group-hover:gap-2.5">
                Ochish <span aria-hidden>→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- qanday ishlaydi ---------- */}
      <section id="qanday" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20">
        <Heading kicker="Qanday ishlaydi" title="Uch qadam — va boshladingiz" />
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-7">
              <span className="font-display text-sm font-bold text-brand">{s.n}</span>
              <h3 className="mt-4 font-display text-xl font-bold text-white">{s.title}</h3>
              <p className="mt-2 leading-relaxed text-zinc-400">{s.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-white/[0.06] p-5">
              <h3 className="flex items-center gap-2 font-semibold text-white">
                <Check />
                {f.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- mobil ilova ---------- */}
      <section id="ilova" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20">
        <div className="card relative grid items-center gap-10 overflow-hidden p-8 sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div aria-hidden className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Mobil ilova</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Hammasi cho&apos;ntagingizda
            </h2>
            <p className="mt-4 max-w-md leading-relaxed text-zinc-400">
              Buyurtmalar, xabarlar, hamyon va tayyorr+ — ilovaning o&apos;zida. Yangi xabar kelsa, darhol bilasiz.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="/api/app/download" className="btn-white">
                Android uchun yuklab olish
              </a>
              <span className="btn-ghost cursor-default text-zinc-500">iOS — tez orada</span>
            </div>
          </div>
          {/* ilova ikonkasi */}
          <div className="animate-float relative mx-auto text-center">
            <span className="grid h-40 w-40 place-items-center rounded-[2.5rem] bg-white shadow-2xl shadow-indigo-500/40 sm:h-48 sm:w-48">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Tayyorr ilovasi" className="h-28 w-28 object-contain sm:h-32 sm:w-32" />
            </span>
            <p className="mt-4 font-display text-lg font-bold text-white">Tayyorr.uz</p>
            <p className="text-sm text-zinc-500">Android ilovasi</p>
          </div>
        </div>
      </section>

      {/* ---------- savollar ---------- */}
      <section id="savollar" className="relative z-10 mx-auto max-w-3xl scroll-mt-28 px-6 py-20">
        <Heading kicker="Savollar" title="Ko'p so'raladigan savollar" />
        <div className="mt-12 divide-y divide-white/[0.06] rounded-3xl border border-white/[0.08]">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-white">
                {f.q}
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/5 text-lg text-zinc-400 transition group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 leading-relaxed text-zinc-400">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ---------- yakuniy CTA ---------- */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-24 pt-10">
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky-500 via-indigo-600 to-fuchsia-600 p-10 text-center sm:p-16">
          <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Bugun boshlang — bepul
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-indigo-100">
            Bir daqiqada ro&apos;yxatdan o&apos;ting va barcha xizmatlardan bitta hisob bilan foydalaning.
          </p>
          <a href={START_URL} className="btn-white mt-8 !px-8 !py-3.5">
            Ro&apos;yxatdan o&apos;tish <span aria-hidden>→</span>
          </a>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Heading({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">{kicker}</p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">{title}</h2>
    </div>
  );
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Hero vizuali: markazda tayyorr+, atrofida xizmatlar — aylanib turuvchi orbita. */
function HeroOrbit() {
  const tiles = [
    { mark: "/logo-mark.png", label: "Ilmiy ishlar", pos: "left-0 top-[6%]", delay: "0s" },
    { mark: "/smm-mark.png", label: "Tayyorr SMM", pos: "-right-2 top-[64%] sm:-right-6", delay: "1.5s" },
  ];
  return (
    <div className="animate-rise relative mx-auto aspect-square w-full max-w-[26rem]" style={{ animationDelay: "160ms" }}>
      <div aria-hidden className="absolute inset-0 rounded-full border border-white/[0.07]" />
      <div aria-hidden className="absolute inset-[14%] rounded-full border border-dashed border-white/10 animate-spin-slow" />
      <div aria-hidden className="absolute inset-[30%] rounded-full bg-indigo-500/25 blur-3xl" />

      {/* markaz — tayyorr+ */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
        <span className="grid h-32 w-32 place-items-center rounded-[2rem] bg-white shadow-2xl shadow-indigo-500/40 sm:h-36 sm:w-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/plus-mark.png" alt="tayyorr+" className="h-24 w-24 object-contain sm:h-28 sm:w-28" />
        </span>
        <p className="mt-3 font-display text-lg font-bold text-white">tayyorr+</p>
      </div>

      {tiles.map((t) => (
        <div key={t.label} className={`animate-float absolute ${t.pos}`} style={{ animationDelay: t.delay }}>
          <div className="glass flex items-center gap-3 rounded-2xl p-2.5 pr-4">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={t.mark} alt="" className="h-9 w-9 object-contain" />
            </span>
            <span className="text-sm font-semibold text-white">{t.label}</span>
          </div>
        </div>
      ))}

      <div className="absolute -bottom-2 left-[38%] -translate-x-1/2">
        <div className="animate-float glass flex items-center gap-3 whitespace-nowrap rounded-2xl px-4 py-3" style={{ animationDelay: "0.8s" }}>
          <span className="text-sm text-zinc-400">Umumiy hamyon</span>
          <span className="font-display text-sm font-bold text-white">1 hisob · 1 hamyon</span>
        </div>
      </div>
    </div>
  );
}
