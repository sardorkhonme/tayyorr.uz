import { redirect } from "next/navigation";

import { signOutAction } from "@/app/(hub)/actions";
import { currentUser } from "@/auth";
import { Icon } from "@/components/icons";
import { db } from "@/lib/db";
import { som } from "@/lib/format";
import { ensureWalletCode } from "@/lib/wallet";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hisoblar" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz";

/** Hisoblar — bitta tayyorr hisobi va u ishlaydigan platformalar. */
export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [walletCode, full, smmOrders] = await Promise.all([
    user.walletCode ?? ensureWalletCode(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { role: true, createdAt: true } }),
    db.smmOrder.count({ where: { userId: user.id } }),
  ]);
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.login || "Foydalanuvchi";
  const avatar = user.avatarUrl ?? user.image;
  const since = full?.createdAt
    ? new Intl.DateTimeFormat("uz-UZ", { timeZone: "Asia/Tashkent", month: "long", year: "numeric" }).format(full.createdAt)
    : null;

  const platforms = [
    {
      mark: "/logo-mark.png",
      title: "Ilmiy ishlar",
      domain: "app.tayyorr.uz",
      href: `${APP_URL}/dashboard`,
      status: full?.role ? (full.role === "PREPARER" ? "Tayyorlovchi" : "Buyurtma beruvchi") : "Rol tanlanmagan",
    },
    {
      mark: "/smm-mark.png",
      title: "Tayyorr SMM",
      domain: "plus.tayyorr.uz/smm",
      href: "/smm",
      status: smmOrders ? `${smmOrders} ta buyurtma` : "Faol",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-zinc-900">Hisoblar</h1>
        <p className="mt-2 text-zinc-500">Bitta tayyorr hisobi — barcha platformalarda bir xil ishlaydi.</p>
      </header>

      {/* asosiy hisob */}
      <section className="card flex flex-col gap-5 !rounded-3xl p-6 sm:flex-row sm:items-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-indigo-100 font-display text-3xl font-bold text-indigo-700">
            {name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-2xl font-bold text-zinc-900">{name}</p>
          <p className="mt-1 truncate text-zinc-500">
            {user.login ? `@${user.login}` : null}
            {user.login && user.email ? " · " : null}
            {user.email}
          </p>
          {since && <p className="mt-1 text-sm text-zinc-400">{since} dan beri a&apos;zo</p>}
        </div>
        <div className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm">
          <p className="text-zinc-500">Hamyon</p>
          <p className="font-display text-lg font-bold text-zinc-900">{som(user.balance)}</p>
          <p className="text-xs text-zinc-400">kod: {walletCode}</p>
        </div>
      </section>

      {/* platformalar */}
      <section>
        <h2 className="font-display text-lg font-bold text-zinc-900">Ulangan platformalar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => (
            <a key={p.title} href={p.href} className="card glow-card group flex items-center gap-4 !rounded-2xl p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-zinc-100 bg-white shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.mark} alt="" className="h-8 w-8 object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900">{p.title}</span>
                <span className="block truncate text-xs text-zinc-500">{p.domain}</span>
              </span>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{p.status}</span>
            </a>
          ))}
        </div>
      </section>

      <form action={signOutAction}>
        <button className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
          <Icon name="logout" className="h-4 w-4" />
          Barcha platformalardan chiqish
        </button>
      </form>
    </div>
  );
}
