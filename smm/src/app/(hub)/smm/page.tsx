import { after } from "next/server";

import { currentUser } from "@/auth";
import { Icon } from "@/components/icons";
import { ServicesBoard } from "@/components/services-board";
import { db } from "@/lib/db";
import { getPricing, rateFor } from "@/lib/pricing";
import { maybeSyncServices } from "@/lib/sync-services";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export const metadata = { title: "Tayyorr SMM" };

const FAQ = [
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
];

export default async function SmmPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string; k?: string }>;
}) {
  const { p, k } = await searchParams;

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

  return (
    <div className="space-y-12">
      <header className="animate-rise flex items-center gap-4">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30">
          <Icon name="rocket" className="h-7 w-7" />
        </span>
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-900">Tayyorr SMM</h1>
          <p className="mt-1 text-zinc-500">Obunachilar, layklar va ko&apos;rishlar — bir necha daqiqada.</p>
        </div>
      </header>

      <ServicesBoard
        services={services}
        loggedIn={!!user}
        balance={user?.balance ?? 0}
        initialPlatform={p ?? null}
        initialKind={k ?? null}
      />

      <section className="pt-8">
        <h2 className="font-display text-2xl font-bold text-zinc-900">Savollar</h2>
        <div className="card mt-6 divide-y divide-zinc-100 !rounded-3xl">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-zinc-900">
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
    </div>
  );
}
