import Link from "next/link";
import { after } from "next/server";

import { currentUser } from "@/auth";
import { Footer } from "@/components/footer";
import { GrowthMockup } from "@/components/growth-mockup";
import { Header } from "@/components/header";
import { ServicesBoard } from "@/components/services-board";
import { TopupButton } from "@/components/topup-button";
import { db } from "@/lib/db";
import { som } from "@/lib/format";
import { getPricing, rateFor } from "@/lib/pricing";
import { maybeSyncServices } from "@/lib/sync-services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STEPS = [
  { icon: "👆", title: "Tarmoqni tanlang", text: "Instagram, Telegram, TikTok, YouTube va boshqalar." },
  { icon: "🎯", title: "Xizmat va miqdor", text: "Obunachi, layk yoki ko'rish — qanchasi kerak bo'lsa." },
  { icon: "🚀", title: "Havola va to'lov", text: "Havolani kiriting — buyurtma darhol avtomatik boshlanadi." },
];

const BENEFITS = [
  { icon: "⚡", title: "Bir necha daqiqada", text: "Ko'pchilik buyurtmalar to'lovdan so'ng darhol boshlanadi." },
  { icon: "🛡️", title: "Pul qaytarish kafolati", text: "Bajarilmagan qism uchun pul hamyoningizga avtomatik qaytadi." },
  { icon: "🔒", title: "Parol so'ralmaydi", text: "Faqat ochiq havola kerak — akkauntingiz xavfsiz qoladi." },
  { icon: "💳", title: "Click orqali to'lov", text: "Hamyonni bir zumda to'ldiring, tayyorr.uz bilan bitta hamyon." },
];

const FAQ = [
  {
    q: "Pul qayerdan yechiladi?",
    a: "Hamyoningizdan. Uni shu yerda Click orqali to'ldirasiz — tayyorr.uz va tayyorr+ uchun bitta hamyon.",
  },
  {
    q: "Buyurtma bajarilmasa nima bo'ladi?",
    a: "Bekor bo'lsa — pul to'liq, qisman bajarilsa — bajarilmagan qismi hamyoningizga avtomatik qaytadi.",
  },
  {
    q: "Qancha vaqtda bajariladi?",
    a: "Ko'pchilik xizmatlar bir necha daqiqada boshlanadi. Holatini «Buyurtmalarim» bo'limida kuzatasiz.",
  },
  {
    q: "Parol yoki akkauntimni berishim kerakmi?",
    a: "Yo'q. Faqat ochiq sahifa, post yoki kanal havolasi kifoya — hech qachon parolingizni so'ramaymiz.",
  },
  {
    q: "tayyorr.uz da hisobim bor — qayta ro'yxatdan o'tishim kerakmi?",
    a: "Yo'q. O'sha login (yoki email) va parol bilan kiring — hisob va hamyon umumiy.",
  },
];

function Check() {
  return (
    <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 text-emerald-500" fill="currentColor" aria-hidden>
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.7-9.3a1 1 0 0 0-1.4-1.4L9 10.6 7.7 9.3a1 1 0 0 0-1.4 1.4l2 2a1 1 0 0 0 1.4 0l4-4Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; welcome?: string; p?: string; k?: string }>;
}) {
  const { topup, welcome, p, k } = await searchParams;

  // xizmatlar provayderdan avtomatik tortiladi: baza bo'sh bo'lsa — darhol,
  // aks holda 6 soatda bir marta, javob qaytgandan keyin (foydalanuvchi kutmaydi)
  if ((await db.smmService.count({ where: { active: true } })) === 0) await maybeSyncServices();
  else after(() => maybeSyncServices());

  const [user, rows, pricing] = await Promise.all([
    currentUser(),
    db.smmService.findMany({
      where: { active: true },
      orderBy: [{ platform: "asc" }, { sort: "asc" }, { providerRate: "asc" }],
      select: {
        id: true,
        platform: true,
        category: true,
        name: true,
        description: true,
        providerRate: true,
        min: true,
        max: true,
        refill: true,
      },
    }),
    getPricing(),
  ]);
  // narx har safar joriy kurs va admin ustamasi bo'yicha hisoblanadi
  const services = pricing
    ? rows.map(({ providerRate, ...s }) => ({ ...s, rate: rateFor(providerRate, pricing) }))
    : [];

  const active = user
    ? await db.smmOrder.count({
        where: { userId: user.id, status: { in: ["PENDING", "PROCESSING", "IN_PROGRESS"] } },
      })
    : 0;
  const greet = user?.firstName || user?.name || user?.login;

  return (
    <>
      <Header user={user} />

      <div className="relative overflow-hidden">
        <div className="hero-bg pointer-events-none absolute inset-0 -z-10" />
        <div className="dots pointer-events-none absolute inset-x-0 top-0 -z-10 h-[620px]" />

        <main className="mx-auto max-w-6xl px-5 sm:px-8">
          {welcome && user && (
            <div className="animate-rise mt-6 flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
              <span>
                🎉 Hisobingiz tayyor! Hamyonni to&apos;ldiring va birinchi buyurtmangizni bering.
              </span>
              <TopupButton className="btn-primary shrink-0 !py-2.5">Hamyonni to&apos;ldirish</TopupButton>
            </div>
          )}
          {topup && user && (
            <div className="animate-rise mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
              Click to&apos;lovi tekshirilmoqda. To&apos;lov o&apos;tgan bo&apos;lsa, balans bir necha soniyada
              yangilanadi — sahifani yangilang.
            </div>
          )}

          {/* Hero */}
          <section className="grid items-center gap-14 pb-20 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:pb-28 lg:pt-20">
            <div className="animate-rise text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white/80 px-3.5 py-1.5 text-sm font-medium text-indigo-700 shadow-sm">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {greet ? `Xush kelibsiz, ${greet}!` : "tayyorr.uz oilasidan yangi xizmat"}
              </span>
              <h1 className="mt-6 font-display text-[2.6rem] font-bold leading-[1.05] tracking-tight text-zinc-900 sm:text-6xl">
                Sahifangizni{" "}
                <span className="bg-gradient-to-r from-indigo-600 via-fuchsia-500 to-amber-500 bg-clip-text text-transparent">
                  bir necha daqiqada
                </span>{" "}
                o&apos;stiring
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-600 lg:mx-0">
                Instagram, Telegram, TikTok va YouTube uchun obunachilar, layklar va ko&apos;rishlar. Tarmoqni
                tanlang, havolani kiriting — qolganini o&apos;zimiz bajaramiz.
              </p>

              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <a href="#start" className="btn-primary !px-7 !py-4 !text-base">
                  Xizmatni tanlash →
                </a>
                {user ? (
                  <TopupButton className="btn-ghost !px-6 !py-4 !text-base">
                    Hamyon: <span className="text-zinc-900">{som(user.balance)}</span>
                  </TopupButton>
                ) : (
                  <Link href="/register" className="btn-ghost !px-6 !py-4 !text-base">
                    Bepul ro&apos;yxatdan o&apos;tish
                  </Link>
                )}
              </div>
              {user && active > 0 && (
                <Link href="/orders" className="mt-5 inline-block text-sm font-medium text-indigo-600 hover:underline">
                  Bajarilayotgan buyurtmalar: {active} →
                </Link>
              )}

              <ul className="mx-auto mt-9 flex max-w-xl flex-col gap-3 text-left text-[15px] text-zinc-700 sm:flex-row sm:flex-wrap sm:gap-x-6 lg:mx-0">
                <li className="flex items-center gap-2">
                  <Check /> Darhol boshlanadi
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Pul qaytarish kafolati
                </li>
                <li className="flex items-center gap-2">
                  <Check /> Parol so&apos;ralmaydi
                </li>
              </ul>
            </div>

            <div className="animate-rise [animation-delay:150ms]">
              <GrowthMockup />
            </div>
          </section>
        </main>
      </div>

      <main className="mx-auto max-w-6xl px-5 pb-24 sm:px-8">
        {/* Qanday ishlaydi */}
        <section className="pb-24">
          <h2 className="text-center font-display text-3xl font-bold text-zinc-900 sm:text-4xl">Qanday ishlaydi?</h2>
          <p className="mx-auto mt-3 max-w-lg text-center text-zinc-500">Uch oddiy qadam — ro&apos;yxatdan o&apos;tish bir daqiqa.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="card relative p-7">
                <span className="absolute right-6 top-5 font-display text-5xl font-bold text-zinc-100">{i + 1}</span>
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-indigo-50 text-2xl">{s.icon}</span>
                <h3 className="mt-5 font-display text-lg font-semibold text-zinc-900">{s.title}</h3>
                <p className="mt-2 leading-relaxed text-zinc-500">{s.text}</p>
              </div>
            ))}
          </div>
        </section>

        <ServicesBoard
          services={services}
          loggedIn={!!user}
          balance={user?.balance ?? 0}
          initialPlatform={p ?? null}
          initialKind={k ?? null}
        />

        {/* Nega tayyorr+ */}
        <section className="pt-28">
          <h2 className="text-center font-display text-3xl font-bold text-zinc-900 sm:text-4xl">
            Nega aynan tayyorr<span className="text-fuchsia-500">+</span>?
          </h2>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="card p-6">
                <span className="text-3xl">{b.icon}</span>
                <h3 className="mt-4 font-display text-lg font-semibold text-zinc-900">{b.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-500">{b.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Savollar */}
        <section id="faq" className="scroll-mt-24 pt-28">
          <h2 className="text-center font-display text-3xl font-bold text-zinc-900 sm:text-4xl">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="card mx-auto mt-12 max-w-3xl divide-y divide-zinc-100 !rounded-3xl">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5 sm:px-8">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-zinc-900">
                  {f.q}
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg text-zinc-500 transition group-open:rotate-45 group-open:bg-indigo-100 group-open:text-indigo-600">
                    +
                  </span>
                </summary>
                <p className="mt-3 leading-relaxed text-zinc-600">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Yakuniy chaqiriq */}
        {!user && (
          <section className="pt-28">
            <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 px-6 py-14 text-center text-white sm:px-12">
              <h2 className="relative font-display text-3xl font-bold sm:text-4xl">Birinchi buyurtmangizni bugun bering</h2>
              <p className="relative mx-auto mt-4 max-w-lg text-lg text-indigo-100">
                Ro&apos;yxatdan o&apos;tish bir daqiqa. tayyorr.uz da hisobingiz bo&apos;lsa — shunchaki kiring.
              </p>
              <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link href="/register" className="btn-dark !bg-white !px-7 !py-4 !text-base !text-zinc-900">
                  Ro&apos;yxatdan o&apos;tish
                </Link>
                <Link href="/login" className="rounded-[0.9rem] border border-white/40 px-7 py-4 text-base font-semibold text-white hover:bg-white/10">
                  Hisobga kirish
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
