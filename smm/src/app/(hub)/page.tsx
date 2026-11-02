import Link from "next/link";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { currentUser } from "@/auth";
import { Icon } from "@/components/icons";
import { PlatformIcon } from "@/components/platform-icon";
import { TopupButton } from "@/components/topup-button";
import { db } from "@/lib/db";
import { num, som } from "@/lib/format";
import { splitServiceName } from "@/lib/kinds";
import { platformOf } from "@/lib/platforms";
import { maybeSyncServices } from "@/lib/sync-services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ACTIVE = ["PENDING", "PROCESSING", "IN_PROGRESS"];
const SMM_PLATFORMS = ["instagram", "telegram", "tiktok", "youtube", "facebook", "twitter"];

/** tayyorr+ bosh sahifasi — xizmatlar paneli (landing yo'q). */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ topup?: string; welcome?: string; p?: string; k?: string }>;
}) {
  const { topup, welcome, p, k } = await searchParams;
  // eski havolalar (?p=instagram&k=followers) — SMM bo'limiga
  if (p) redirect(`/smm?p=${encodeURIComponent(p)}${k ? `&k=${encodeURIComponent(k)}` : ""}`);

  // xizmatlar provayderdan avtomatik tortiladi: baza bo'sh bo'lsa — darhol, aks holda fonda
  if ((await db.smmService.count({ where: { active: true } })) === 0) await maybeSyncServices();
  else after(() => maybeSyncServices());

  const user = await currentUser();
  const [smmCount, recent, activeCount] = await Promise.all([
    db.smmService.count({ where: { active: true } }),
    user
      ? db.smmOrder.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 3,
          include: { service: { select: { name: true, platform: true } } },
        })
      : [],
    user ? db.smmOrder.count({ where: { userId: user.id, status: { in: ACTIVE } } }) : 0,
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
            Hisobingiz tayyor! Hamyonni to&apos;ldiring va birinchi xizmatdan foydalaning.
          </span>
          <TopupButton className="btn-primary shrink-0 !py-2.5">Hamyonni to&apos;ldirish</TopupButton>
        </div>
      )}
      {topup && user && (
        <div className="animate-rise rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-800">
          Click to&apos;lovi tekshirilmoqda. To&apos;lov o&apos;tgan bo&apos;lsa, balans bir necha soniyada
          yangilanadi — sahifani yangilang.
        </div>
      )}

      <header className="animate-rise">
        <p className="text-sm font-medium text-indigo-600">{greet ? `Salom, ${greet}!` : "Xush kelibsiz!"}</p>
        <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
          tayyorr<span className="text-fuchsia-500">+</span> xizmatlari
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500">
          Bitta hisob va bitta hamyon bilan barcha xizmatlar. Kerakligini tanlang.
        </p>
      </header>

      {/* xizmatlar */}
      <section className="grid gap-5 md:grid-cols-2">
        <Link
          href="/smm"
          className="card glow-card group relative flex flex-col overflow-hidden !rounded-3xl p-6 sm:p-7"
        >
          <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-fuchsia-200/50 blur-3xl" />
          <div className="flex items-start justify-between gap-4">
            <span className="shine grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
              <Icon name="rocket" className="h-7 w-7" />
            </span>
            {smmCount > 0 && (
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {num(smmCount)} ta xizmat
              </span>
            )}
          </div>
          <h2 className="mt-5 font-display text-2xl font-bold text-zinc-900">Tayyorr SMM</h2>
          <p className="mt-2 leading-relaxed text-zinc-500">
            Obunachilar, layklar va ko&apos;rishlar — bir necha daqiqada, avtomatik. Bajarilmasa pul qaytadi.
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
          <span className="mt-6 inline-flex items-center gap-2 font-semibold text-indigo-600 transition group-hover:gap-3">
            Ochish <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.2} />
          </span>
        </Link>

        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-zinc-200 p-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-fuchsia-100 text-fuchsia-600">
            <Icon name="sparkles" className="h-6 w-6" />
          </span>
          <h2 className="mt-3 font-display text-lg font-bold text-zinc-900">Yangi xizmatlar tez orada</h2>
          <p className="mt-1.5 max-w-xs text-sm text-zinc-500">tayyorr+ doimiy kengayib boradi — kuzatib boring.</p>
        </div>
      </section>

      {/* oxirgi buyurtmalar / mehmon uchun taklif */}
      {user ? (
        <section className="card !rounded-3xl p-6 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold text-zinc-900">Oxirgi buyurtmalar</h2>
              <p className="text-sm text-zinc-500">
                {activeCount ? `Bajarilmoqda: ${activeCount}` : "Faol buyurtma yo'q"}
              </p>
            </div>
            <Link href="/orders" className="text-sm font-semibold text-indigo-600 hover:underline">
              <span className="inline-flex items-center gap-1">
                Hammasi <Icon name="arrow-right" className="h-4 w-4" strokeWidth={2.2} />
              </span>
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-50 px-4 py-6 text-center text-zinc-500">
              Hali buyurtma yo&apos;q.{" "}
              <Link href="/smm" className="font-semibold text-indigo-600 hover:underline">
                Birinchisini bering
              </Link>
            </p>
          ) : (
            <ul className="mt-5 divide-y divide-zinc-100">
              {recent.map((o) => {
                const pl = platformOf(o.service.platform);
                return (
                  <li key={o.id} className="flex items-center gap-3 py-3">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${pl.from}, ${pl.to})` }}
                    >
                      <PlatformIcon platform={pl.key} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-zinc-900">
                        {splitServiceName(o.service.name).title}
                      </span>
                      <span className="text-sm text-zinc-500">
                        {num(o.quantity)} ta · {som(o.charge)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <section className="shine relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-7 text-white sm:p-9">
          <h2 className="font-display text-2xl font-bold sm:text-3xl">Bir daqiqada boshlang</h2>
          <p className="mt-2 max-w-lg text-indigo-100">
            Ro&apos;yxatdan o&apos;ting yoki tayyorr.uz hisobingiz bilan kiring — hamyon umumiy.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Link href="/register" className="btn-dark !bg-white !px-6 !py-3.5 !text-zinc-900">
              Ro&apos;yxatdan o&apos;tish
            </Link>
            <Link href="/login" className="rounded-[0.9rem] border border-white/40 px-6 py-3.5 text-center font-semibold hover:bg-white/10">
              Kirish
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
