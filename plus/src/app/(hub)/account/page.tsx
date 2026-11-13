import { redirect } from "next/navigation";

import { saveAccountAction } from "@/app/(hub)/account/actions";
import { currentUser } from "@/auth";
import { AccountEditor } from "@/components/account-editor";
import { Icon } from "@/components/icons";
import { SignOutButton } from "@/components/sign-out-button";
import { SendSoundToggle } from "@/components/send-sound-toggle";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getAccount } from "@/lib/account";
import { db } from "@/lib/db";
import { SMM_URL } from "@/lib/hub-nav";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hisoblar" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.tayyorr.uz";

/** Hisoblar — akkaunt ma'lumotlari (tahrirlanadi) va u ishlaydigan platformalar. */
export default async function AccountPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  const [account, full, smmOrders] = await Promise.all([
    getAccount(user.id),
    db.user.findUnique({ where: { id: user.id }, select: { role: true } }),
    db.smmOrder.count({ where: { userId: user.id } }),
  ]);
  if (!account) redirect("/login");

  const platforms = [
    {
      mark: "/logo-mark.png",
      title: "Tayyorr.uz",
      href: `${APP_URL}/dashboard`,
      status: full?.role ? (full.role === "PREPARER" ? "Tayyorlovçi" : "Buyurtma beruvçi") : "Rol tanlanmagan",
    },
    {
      mark: "/smm-mark.png",
      title: "Tayyorr SMM",
      href: SMM_URL,
      status: smmOrders ? `${smmOrders} ta buyurtma` : "Faol",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <h1 className="font-display text-3xl font-bold text-zinc-900">Hisoblar</h1>
        <p className="mt-2 text-zinc-500">Bitta tayyorr hisobi — özgarişlar barça platformalarda bir xil körinadi.</p>
      </header>

      <AccountEditor initial={account} save={saveAccountAction} />

      <section>
        <h2 className="font-display text-lg font-bold text-zinc-900">Ulangan platformalar</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {platforms.map((p) => (
            <a key={p.title} href={p.href} className="card glow-card group flex items-center gap-4 !rounded-2xl p-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-black/5 bg-[#ffffff] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.mark} alt="" className="h-8 w-8 object-contain" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-zinc-900">{p.title}</span>
              </span>
              <span className="shrink-0 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">{p.status}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="card flex flex-col gap-4 !rounded-3xl p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900">Köriniş</h2>
          <p className="mt-1 text-sm text-zinc-500">Yoruğ yoki qoronği mavzu — tayyorr+, Tayyorr.uz va Tayyorr SMM da bir xil.</p>
        </div>
        <ThemeSwitcher />
      </section>

      <section className="card flex flex-col gap-4 !rounded-3xl p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-zinc-900">Sozlamalar</h2>
          <p className="mt-1 text-sm text-zinc-500">tayyorr+, Tayyorr.uz va Tayyorr SMM da bir xil.</p>
        </div>
        <SendSoundToggle />
      </section>

      <SignOutButton
        name={user.firstName || user.name || user.login}
        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100"
      >
        <Icon name="logout" className="h-4 w-4" />
        Barça platformalardan çiqiş
      </SignOutButton>
    </div>
  );
}
