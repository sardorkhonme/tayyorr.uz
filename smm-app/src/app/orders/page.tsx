import { redirect } from "next/navigation";

import { currentUser, loginUrl } from "@/lib/session";
import { Icon } from "@/components/icons";
import { PlatformIcon } from "@/components/platform-icon";
import { splitServiceName } from "@/lib/kinds";
import { db } from "@/lib/db";
import { num, som } from "@/lib/format";
import { syncOrders } from "@/lib/orders";
import { platformOf } from "@/lib/platforms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyurtmalarim" };

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Navbatda", cls: "bg-zinc-100 text-zinc-600" },
  PROCESSING: { label: "Qabul qilindi", cls: "bg-sky-50 text-sky-700" },
  IN_PROGRESS: { label: "Bajarilmoqda", cls: "bg-indigo-50 text-indigo-700" },
  COMPLETED: { label: "Bajarildi", cls: "bg-emerald-50 text-emerald-700" },
  PARTIAL: { label: "Qisman", cls: "bg-amber-50 text-amber-700" },
  CANCELED: { label: "Bekor qilindi", cls: "bg-red-50 text-red-700" },
  FAILED: { label: "Xatolik", cls: "bg-red-50 text-red-700" },
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
  if (!user) redirect(await loginUrl("/orders"));

  await syncOrders(user.id);
  const orders = await db.smmOrder.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { service: { select: { name: true, platform: true } } },
  });

  return (
    <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-zinc-900">Buyurtmalarim</h1>
        <p className="mt-2 text-zinc-500">Holatlar sahifa oçilganda yangilanadi. Bajarilmagan qism uçun pul avtomatik qaytadi.</p>

        {orders.length === 0 ? (
          <div className="card mt-8 !rounded-3xl px-6 py-16 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-indigo-50 text-indigo-500">
              <Icon name="package" className="h-8 w-8" />
            </span>
            <p className="mt-4 font-display text-xl font-bold text-zinc-900">Hali buyurtma yöq</p>
            <p className="mt-2 text-zinc-500">Birinçi buyurtmangizni bir daqiqada bering.</p>
            <a href="/" className="btn-primary mt-6">Xizmat tanlaş</a>
          </div>
        ) : (
          <ul className="mt-8 space-y-3">
            {orders.map((o) => {
              const p = platformOf(o.service.platform);
              const st = STATUS[o.status] ?? STATUS.PENDING;
              const done = o.remains != null ? Math.max(o.quantity - o.remains, 0) : null;
              return (
                <li key={o.id} className="card glow-card flex gap-4 p-5">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                  >
                    <PlatformIcon platform={p.key} className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="font-medium leading-snug text-zinc-900">{splitServiceName(o.service.name).title}</p>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-zinc-500">{o.link}</p>
                    <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-zinc-600">
                      <span>{num(o.quantity)} dona</span>
                      <span>{som(o.charge)}</span>
                      {done != null && o.status === "IN_PROGRESS" && <span>Bajarildi: {num(done)}</span>}
                      {o.refundAmount ? <span className="font-medium text-emerald-700">Qaytarildi: {som(o.refundAmount)}</span> : null}
                      <span className="text-zinc-400">{dateFmt.format(o.createdAt)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
    </div>
  );
}
