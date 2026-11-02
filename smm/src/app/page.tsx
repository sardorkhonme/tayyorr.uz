import { after } from "next/server";

import { currentUser } from "@/auth";
import { Header } from "@/components/header";
import { ServicesBoard } from "@/components/services-board";
import { TopupButton } from "@/components/topup-button";
import { db } from "@/lib/db";
import { MAIN_URL, som } from "@/lib/format";
import { getPricing, rateFor } from "@/lib/pricing";
import { maybeSyncServices } from "@/lib/sync-services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const STEPS = [
  { title: "Tarmoqni tanlang", text: "Instagram, Telegram, TikTok, YouTube va boshqalar." },
  { title: "Xizmat va miqdorni belgilang", text: "Obunachi, layk yoki ko'rish — qanchasi kerak bo'lsa." },
  { title: "Havolani kiriting va to'lang", text: "Pul hamyondan yechiladi, buyurtma avtomatik boshlanadi." },
];

const FAQ = [
  {
    q: "Pul qayerdan yechiladi?",
    a: "tayyorr.uz hamyoningizdan. Hamyonni shu yerda Click orqali to'ldirishingiz mumkin — ikkala saytda bitta hamyon.",
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
    q: "Parol yoki akkaunt kerakmi?",
    a: "Yo'q. Faqat ochiq sahifa, post yoki kanal havolasi kifoya — hech qachon parolingizni so'ramaymiz.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; p?: string; k?: string }>;
}) {
  const { topup, p, k } = await searchParams;

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
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] bg-grid" />
      <div className="pointer-events-none absolute left-1/2 top-[-220px] -z-10 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[130px]" />

      <main className="mx-auto max-w-5xl px-5 pb-28 sm:px-8">
        {topup && user && (
          <div className="animate-rise mt-8 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-5 py-4 text-emerald-200">
            Click to&apos;lovi tekshirilmoqda. To&apos;lov o&apos;tgan bo&apos;lsa, balans bir necha soniyada
            yangilanadi — sahifani yangilang.
          </div>
        )}

        {/* Hero */}
        <section className="animate-rise pb-16 pt-16 text-center sm:pb-20 sm:pt-24">
          <p className="text-sm font-medium text-indigo-300">
            {greet ? `Salom, ${greet}!` : "tayyorr.uz oilasidan yangi xizmat"}
          </p>
          <h1 className="mx-auto mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.1] text-white sm:text-6xl">
            Sahifangizni{" "}
            <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
              bir necha daqiqada
            </span>{" "}
            o&apos;stiring
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-zinc-400">
            Obunachilar, layklar va ko&apos;rishlar — tarmoqni tanlang, havolani kiriting, qolganini o&apos;zimiz
            bajaramiz.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#start" className="btn-primary !px-7 !py-3.5 !text-base">
              Boshlash
            </a>
            {user ? (
              <TopupButton className="btn-ghost !px-6 !py-3.5 !text-base">
                Hamyon: <span className="font-semibold text-white">{som(user.balance)}</span>
              </TopupButton>
            ) : (
              <a href="/login" className="btn-ghost !px-6 !py-3.5 !text-base">
                Hisobga kirish
              </a>
            )}
          </div>
          {user && active > 0 && (
            <a href="/orders" className="mt-5 inline-block text-sm text-zinc-400 hover:text-white">
              Bajarilayotgan buyurtmalar: <span className="font-semibold text-white">{active}</span> →
            </a>
          )}
        </section>

        {/* Qanday ishlaydi */}
        <section className="mb-24 grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <span className="font-display text-sm font-semibold text-indigo-300">0{i + 1}</span>
              <h3 className="mt-3 font-display text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{s.text}</p>
            </div>
          ))}
        </section>

        <ServicesBoard
          services={services}
          loggedIn={!!user}
          balance={user?.balance ?? 0}
          initialPlatform={p ?? null}
          initialKind={k ?? null}
        />

        {/* Savollar */}
        <section className="mt-28">
          <h2 className="text-center font-display text-2xl font-semibold text-white sm:text-3xl">Ko&apos;p so&apos;raladigan savollar</h2>
          <div className="mx-auto mt-10 max-w-3xl divide-y divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.02]">
            {FAQ.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-zinc-100">
                  {f.q}
                  <span className="text-xl text-zinc-500 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-zinc-400">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {!user && (
          <p className="mt-16 text-center text-zinc-500">
            Hali hisobingiz yo&apos;qmi?{" "}
            <a href={`${MAIN_URL}/register?from=smm`} className="text-indigo-300 hover:underline">
              tayyorr.uz da bepul ro&apos;yxatdan o&apos;ting
            </a>
          </p>
        )}
      </main>
    </>
  );
}
