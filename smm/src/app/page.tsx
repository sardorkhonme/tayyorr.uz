import { currentUser } from "@/auth";
import { Header } from "@/components/header";
import { ServicesBoard } from "@/components/services-board";
import { db } from "@/lib/db";
import { MAIN_URL, som } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [user, services] = await Promise.all([
    currentUser(),
    db.smmService.findMany({
      where: { active: true },
      orderBy: [{ platform: "asc" }, { sort: "asc" }, { rate: "asc" }],
      select: {
        id: true,
        platform: true,
        category: true,
        name: true,
        description: true,
        rate: true,
        min: true,
        max: true,
        refill: true,
      },
    }),
  ]);

  const active = user
    ? await db.smmOrder.count({ where: { userId: user.id, status: { in: ["PENDING", "PROCESSING", "IN_PROGRESS"] } } })
    : 0;
  const greet = user?.firstName || user?.name || user?.login;

  return (
    <>
      <Header user={user} />
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-grid" />
      <div className="pointer-events-none absolute left-1/2 top-[-180px] -z-10 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-indigo-600/25 blur-[120px]" />

      <main className="mx-auto max-w-6xl space-y-10 px-4 pb-20 pt-8 sm:px-6 sm:pt-12">
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="animate-rise">
            <p className="text-sm text-indigo-300">{greet ? `Salom, ${greet} 👋` : "tayyorr.uz oilasidan"}</p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Sahifangizni o'stiring —<br />
              <span className="bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-amber-200 bg-clip-text text-transparent">
                obunachi, layk va ko'rishlar
              </span>
            </h1>
            <p className="mt-3 max-w-lg text-zinc-400">
              Xizmatni tanlang, havolani kiriting — buyurtma avtomatik bajariladi. To'lov tayyorr.uz hamyoningizdan.
            </p>
          </div>

          <div className="card animate-rise flex flex-col justify-between gap-5 [animation-delay:80ms]">
            {user ? (
              <>
                <div>
                  <p className="text-sm text-zinc-500">Hamyon balansi</p>
                  <p className="mt-1 font-display text-3xl font-bold text-white">{som(user.balance)}</p>
                  {user.walletCode && <p className="mt-1 text-xs text-zinc-500">Hisob kodi: {user.walletCode}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <a href={`${MAIN_URL}/wallet`} className="btn-primary flex-1">Hamyonni to'ldirish</a>
                  <a href="/orders" className="btn-ghost">
                    Faol: <span className="font-semibold text-white">{active}</span>
                  </a>
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="font-display text-lg font-semibold text-white">tayyorr.uz hisobingiz bilan kiring</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Alohida ro'yxatdan o'tish shart emas — o'sha login, parol va hamyon.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a href="/login" className="btn-primary flex-1">Kirish</a>
                  <a href={`${MAIN_URL}/register`} className="btn-ghost">Ro'yxatdan o'tish</a>
                </div>
              </>
            )}
          </div>
        </section>

        <ServicesBoard services={services} loggedIn={!!user} balance={user?.balance ?? 0} />
      </main>
    </>
  );
}
