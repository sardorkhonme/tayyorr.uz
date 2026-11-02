import { redirect } from "next/navigation";

import { currentUser } from "@/auth";
import { Header } from "@/components/header";
import { PlatformIcon } from "@/components/platform-icon";
import { db } from "@/lib/db";
import { num, som } from "@/lib/format";
import { syncOrders } from "@/lib/orders";
import { platformOf } from "@/lib/platforms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyurtmalarim" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Navbatda", cls: "bg-zinc-500/15 text-zinc-300" },
  PROCESSING: { label: "Qabul qilindi", cls: "bg-sky-500/15 text-sky-300" },
  IN_PROGRESS: { label: "Bajarilmoqda", cls: "bg-indigo-500/15 text-indigo-300" },
  COMPLETED: { label: "Bajarildi", cls: "bg-emerald-500/15 text-emerald-300" },
  PARTIAL: { label: "Qisman", cls: "bg-amber-500/15 text-amber-300" },
  CANCELED: { label: "Bekor qilindi", cls: "bg-red-500/15 text-red-300" },
  FAILED: { label: "Xatolik", cls: "bg-red-500/15 text-red-300" },
};

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function OrdersPage() {
  const user = await currentUser();
  if (!user) redirect("/login");

  await syncOrders(user.id);
  const orders = await db.smmOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { service: { select: { name: true, platform: true } } },
  });

  return (
    <>
      <Header user={user} />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        <h1 className="font-display text-2xl font-semibold text-white">Buyurtmalarim</h1>
        <p className="mt-1 text-sm text-zinc-500">Holatlar sahifa ochilganda provayderdan yangilanadi.</p>

        {orders.length === 0 ? (
          <div className="card mt-6 py-14 text-center">
            <p className="text-white">Hali buyurtma yo'q</p>
            <a href="/" className="btn-primary mt-4">Xizmat tanlash</a>
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => {
              const p = platformOf(o.service.platform);
              const st = STATUS[o.status] ?? STATUS.PENDING;
              const done = o.remains != null ? Math.max(o.quantity - o.remains, 0) : null;
              return (
                <li key={o.id} className="card flex gap-4 !p-4">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                  >
                    <PlatformIcon platform={p.key} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium leading-snug text-zinc-100">{o.service.name}</p>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-500">{o.link}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
                      <span>{num(o.quantity)} dona</span>
                      <span>{som(o.charge)}</span>
                      {done != null && o.status === "IN_PROGRESS" && <span>Bajarildi: {num(done)}</span>}
                      {o.refundAmount ? <span className="text-emerald-300">Qaytarildi: {som(o.refundAmount)}</span> : null}
                      <span className="text-zinc-600">{dateFmt.format(o.createdAt)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}
