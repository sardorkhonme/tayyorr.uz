import { LandingVideos } from "@/components/landing-videos";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getLandingMedia } from "@/lib/landing-data";
import { APP_URL, PLUS_URL, SMM_URL, START_URL } from "@/lib/links";

// video panjarasi admin panelda boshqariladi — 5 daqiqada yangilanadi
export const revalidate = 300;

const SERVICES = [
  {
    mark: "/logo-mark.png",
    title: "Tayyorr.uz",
    href: `${APP_URL}/dashboard`,
    glow: "rgba(56, 189, 248, 0.22)",
    text: "Prezentatsiya, kurs işi, referat va diplom işi uçun işonçli tayyorlovçi toping — yoki özingiz tayyorlab daromad qiling.",
    points: ["Takliflardan narx va reyting böyiça tanlaysiz", "Pul iş yakunlangunça himoyada turadi"],
  },
  {
    mark: "/smm-mark.png",
    title: "Tayyorr SMM",
    href: SMM_URL,
    glow: "rgba(217, 70, 239, 0.22)",
    text: "Instagram, Telegram, TikTok va YouTube uçun obunaçi, layk va körişlar — buyurtma bir neça daqiqada avtomatik boşlanadi.",
    points: ["Bajarilmasa — pul avtomatik qaytadi", "Parol söralmaydi, faqat havola"],
  },
  {
    mark: "/plus-mark.png",
    title: "tayyorr+",
    href: PLUS_URL,
    glow: "rgba(139, 92, 246, 0.25)",
    text: "Barça xizmatlarning boşqaruv paneli: bitta hisob, umumiy hamyon va yordam. Yangi xizmatlar ham şu yerda paydo böladi.",
    points: ["Bir marta kirasiz — hamma joyda kirgansiz", "Hamyon barça xizmatlarda umumiy"],
  },
];

const STEPS = [
  { n: "01", title: "Röyxatdan öting", text: "Google orqali bir daqiqada — tayyorr+ da bitta hisob oçasiz." },
  { n: "02", title: "Hamyonni töldiring", text: "Click orqali. Balans barça xizmatlarda bir xil işlaydi." },
  { n: "03", title: "Xizmatni tanlang", text: "Ilmiy iş buyurtma qiling yoki SMM xizmatini işga tuşiring." },
];

const FEATURES = [
  { title: "Bitta hisob", text: "Har bir xizmat uçun alohida röyxatdan ötiş şart emas." },
  { title: "Umumiy hamyon", text: "Bir marta töldirasiz — hamma xizmatda işlatasiz." },
  { title: "Xavfsiz tölov", text: "Click orqali; bajarilmagan iş uçun pul qaytariladi." },
  { title: "Tezkor yordam", text: "Savol bölsa — sayt içidagi çat orqali yozing." },
];

const FAQ = [
  {
    q: "Har bir xizmat uçun alohida röyxatdan ötişim kerakmi?",
    a: "Yöq. tayyorr+ da bir marta röyxatdan ötasiz — şu hisob bilan barça xizmatlarga avtomatik kirasiz.",
  },
  {
    q: "Hamyon qanday işlaydi?",
    a: "Hamyon bitta: Click orqali töldirasiz va balansni istalgan xizmatda işlatasiz. Pulni kartaga yeçib oliş ham mumkin.",
  },
  {
    q: "Xizmat bajarilmasa nima böladi?",
    a: "SMM buyurtmasi bajarilmasa yoki qisman bajarilsa — pul hamyonga avtomatik qaytadi. Ilmiy işlarda pul iş qabul qilingunga qadar himoyada turadi.",
  },
  {
    q: "Mobil ilova bormi?",
    a: "Ha, Android uçun ilova bor — pastdagi tugma orqali yuklab oling. iOS versiyasi tez orada.",
  },
];

export default async function Home() {
  const media = await getLandingMedia();

  return (
    <main className="relative overflow-hidden">
      {/* hero foni — suyuq shisha lentalar (telefonda tik versiyasi), pastda sahifa foniga singadi */}
      <div aria-hidden className="hero-bg pointer-events-none absolute inset-x-0 top-0 h-[100svh] min-h-[40rem]">
        <picture>
          <source media="(max-width: 767px)" srcSet="/hero-bg-mobile.webp" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/hero-bg.webp" alt="" fetchPriority="high" className="animate-bg-in h-full w-full object-cover" />
        </picture>
      </div>

      <SiteHeader />

      {/* ---------- hero ---------- */}
      <section className="relative z-10 mx-auto flex min-h-[88svh] max-w-5xl flex-col items-center justify-center px-6 pb-20 pt-36 text-center lg:pt-40">
        <div>
          {/* shior: Tayyorr.uz — sizga keraklisi tayyorr. */}
          <h1
            className="animate-rise font-display text-5xl font-bold leading-[1.04] tracking-tight text-white sm:text-7xl lg:text-8xl"
            style={{ animationDelay: "60ms" }}
          >
            <span className="text-brand">Tayyorr.uz</span> — sizga
            <br />
            keraklisi <span className="text-brand">tayyorr.</span>
          </h1>
          <p
            className="animate-rise mx-auto mt-7 max-w-2xl text-lg leading-relaxed text-zinc-400 sm:text-xl"
            style={{ animationDelay: "120ms" }}
          >
            Ilmiy işlaringiz uçun tayyorlovçi toping, ijtimoiy tarmoqlaringizni östiring — barçasi bitta
            hisob va bitta hamyon bilan.
          </p>
          <div
            className="animate-rise mt-10 flex flex-col justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "180ms" }}
          >
            <a href={START_URL} className="btn-white !px-7 !py-3.5">
              Bepul boşlaş <span aria-hidden>→</span>
            </a>
            <a href="#xizmatlar" className="btn-ghost !px-7 !py-3.5">
              Xizmatlarni köriş
            </a>
          </div>
        </div>
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
                Oçiş <span aria-hidden>→</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ---------- qanday ishlaydi ---------- */}
      <section id="qanday" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20">
        <Heading kicker="Qanday işlaydi" title="Uç qadam — va boşladingiz" />
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
      <section id="ilova" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 pb-20 pt-52 sm:pt-60 lg:pt-44">
        {/* telefon kartadan yuqoriga chiqib turadi */}
        <div className="card relative p-8 pt-40 sm:p-12 sm:pt-56 lg:min-h-[22rem] lg:pt-12">
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
            <div className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />
          </div>
          <div className="pointer-events-none absolute -top-44 left-1/2 w-[22rem] max-w-[92vw] -translate-x-1/2 sm:-top-52 sm:w-[30rem] lg:-top-40 lg:left-auto lg:right-2 lg:w-[34rem] lg:translate-x-0">
            <div className="animate-float">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/app-phone.webp"
                alt="Tayyorr.uz Android ilovasi"
                width={1100}
                height={943}
                loading="lazy"
                className="h-auto w-full drop-shadow-[0_30px_60px_rgba(124,58,237,0.35)]"
              />
            </div>
          </div>
          <div className="relative text-center lg:max-w-[55%] lg:text-left">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Mobil ilova</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Hammasi çöntagingizda
            </h2>
            <p className="mx-auto mt-4 max-w-md leading-relaxed text-zinc-400 lg:mx-0">
              Buyurtmalar, xabarlar, hamyon va tayyorr+ — ilovaning özida. Yangi xabar kelsa, darhol bilasiz.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
              <a href="/api/app/download" className="btn-white">
                Android uçun yuklab oliş
              </a>
              <span className="btn-ghost cursor-default text-zinc-500">iOS — tez orada</span>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- videolar (admin panelda boshqariladi) ---------- */}
      <LandingVideos videos={media.videos} />

      {/* ---------- savollar ---------- */}
      <section id="savollar" className="relative z-10 mx-auto max-w-3xl scroll-mt-28 px-6 py-20">
        <Heading kicker="Savollar" title="Köp söraladigan savollar" />
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
            Bugun boşlang — bepul
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-indigo-100">
            Bir daqiqada röyxatdan öting va barça xizmatlardan bitta hisob bilan foydalaning.
          </p>
          <a href={START_URL} className="btn-white mt-8 !px-8 !py-3.5">
            Röyxatdan ötiş <span aria-hidden>→</span>
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
