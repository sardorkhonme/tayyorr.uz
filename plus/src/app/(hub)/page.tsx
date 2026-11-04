import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { Icon } from "@/components/icons";
import { PlatformIcon } from "@/components/platform-icon";
import { TopupButton } from "@/components/topup-button";
import { db } from "@/lib/db";
import { MAIN_SITE_URL, SMM_URL } from "@/lib/hub-nav";
import { num } from "@/lib/format";
import { platformOf } from "@/lib/platforms";

export const dynamic = "force-dynamic";
const SMM_PLATFORMS = ["instagram", "telegram", "tiktok", "youtube", "facebook", "twitter"];

/**
 * Kartadagi "Ochish" — karta ustiga borilganda gradient fon silliq paydo bo'ladi,
 * matn oq bo'ladi, strelka o'ngga suriladi (hamma xizmat kartalarida bir xil).
 */
function OpenPill() {
  return (
    <span className="relative -ml-4 inline-flex items-center gap-2 overflow-hidden rounded-full px-4 py-2 font-semibold text-indigo-600 transition-[color,box-shadow] duration-300 group-hover:text-white group-hover:shadow-lg group-hover:shadow-fuchsia-500/30">
      <span className="absolute inset-0 -z-0 bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative">Oçiş</span>
      <Icon
        name="arrow-right"
        className="relative h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
        strokeWidth={2.2}
      />
    </span>
  );
}

/** tayyorr+ bosh sahifasi — xizmatlar paneli (landing yo'q). */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; welcome?: string; p?: string; k?: string }>;
}) {
  const { topup, welcome, p, k } = await searchParams;
  // eski havolalar (?p=instagram&k=followers) — Tayyorr SMM endi alohida saytda
  if (p) redirect(`${SMM_URL}/?p=${encodeURIComponent(p)}${k ? `&k=${encodeURIComponent(k)}` : ""}`);

  const [user, smmCount] = await Promise.all([
    currentUser(),
    db.smmService.count({ where: { active: true } }),
  ]);
  const greet = user?.firstName || user?.name || user?.login;

  return (
    <div className="space-y-10">
      {welcome && user && (
        <div className="animate-rise flex flex-col gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4 text-indigo-900 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white text-indigo-600 shadow-sm">
              <Icon name="party" />
            </span>
            Hisobingiz tayyor! Hamyonni töldiring va birinçi xizmatdan foydalaning.
          </span>
          <TopupButton className="btn-primary shrink-0 !py-2.5">Hamyonni töldiriş</TopupButton>
        </div>
      )}
      {topup && user && (
        <div className="animate-rise rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          Click tölovi tekşirilmoqda. Tölov ötgan bölsa, balans bir neça soniyada
          yangilanadi — sahifani yangilang.
        </div>
      )}

      <header className="animate-rise">
        <p className="text-sm font-medium text-indigo-600">{greet ? `Salom, ${greet}!` : "Xuş kelibsiz!"}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          tayyorr<span className="text-fuchsia-500">+</span> xizmatlari
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">
          Bitta hisob va bitta hamyon bilan barça xizmatlar. Kerakligini tanlang.
        </p>
      </header>

      {/* xizmatlar */}
      <section className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <a
          href={SMM_URL}
          className="card glow-card group relative flex flex-col overflow-hidden !rounded-3xl p-6 sm:p-7"
        >
          <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-200/50 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <span className="shine grid h-14 w-14 place-items-center rounded-2xl border border-indigo-100 bg-white shadow-lg shadow-violet-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/smm-mark.png" alt="Tayyorr SMM" className="h-10 w-10 object-contain" />
            </span>
            {smmCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {num(smmCount)} ta xizmat
              </span>
            )}
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-zinc-900">Tayyorr SMM</h2>
          <p className="mt-2 leading-relaxed text-zinc-500">
            Obunaçilar, layklar va körişlar — bir neça daqiqada, avtomatik. Bajarilmasa pul qaytadi.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {SMM_PLATFORMS.map((key) => {
              const pl = platformOf(key);
              return (
                <span
                  key={key}
                  title={pl.name}
                  className="grid h-9 w-9 place-items-center rounded-xl text-white"
                  style={{ background: `linear-gradient(135deg, ${pl.from}, ${pl.to})` }}
                >
                  <PlatformIcon platform={key} className="h-4.5 w-4.5" />
                </span>
              );
            })}
          </div>
          <span className="mt-auto pt-6">
            <OpenPill />
          </span>
        </a>

        {/* Ilmiy ishlar (app.tayyorr.uz) — tayyorr+ xizmatlaridan biri */}
        <a
          href={MAIN_SITE_URL}
          style={{ "--glow": "#4f46e5" } as React.CSSProperties}
          className="card glow-card group relative flex flex-col overflow-hidden !rounded-3xl p-6 sm:p-7"
        >
          <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-indigo-200/50 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <span className="shine grid h-14 w-14 place-items-center rounded-2xl border border-indigo-100 bg-white shadow-lg shadow-indigo-500/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.png" alt="Tayyorr.uz" className="h-10 w-10 object-contain" />
            </span>
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-zinc-900">
            Tayyorr.uz
          </h2>
          <p className="mt-2 leading-relaxed text-zinc-500">
            Prezentatsiya, kurs işi, referat va diplom işini işonçli tayyorlovçilarga buyurtma qiling.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {["Prezentatsiya", "Kurs işi", "Referat", "Diplom işi"].map((t) => (
              <span key={t} className="rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600">
                {t}
              </span>
            ))}
          </div>
          <span className="mt-auto pt-6">
            <OpenPill />
          </span>
        </a>

        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-8 text-center md:col-span-2 lg:col-span-1">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-fuchsia-100 text-fuchsia-600">
            <Icon name="sparkles" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-lg font-bold text-zinc-900">Yangi xizmatlar tez orada</h2>
          <p className="mt-1.5 max-w-xs text-sm text-zinc-500">tayyorr+ doimiy kengayib boradi — kuzatib boring.</p>
        </div>
      </section>

      {/* mehmon uchun taklif */}
      {!user && (
        <section className="shine relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white sm:p-9">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Bir daqiqada boşlang</h2>
          <p className="mt-2 max-w-lg text-indigo-100">
            Röyxatdan öting yoki tayyorr hisobingiz bilan kiring — hamyon umumiy.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-dark !bg-white !px-6 !py-3.5 !text-zinc-900">
              Röyxatdan ötiş
            </Link>
            <Link href="/login" className="rounded-[0.9rem] border border-white/40 px-6 py-3.5 text-center font-semibold hover:bg-white/10">
              Kiriş
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
