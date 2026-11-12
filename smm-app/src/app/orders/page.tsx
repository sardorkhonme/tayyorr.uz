import Link from "next/link";
import { redirect } from "next/navigation";

import { currentUser, loginUrl } from "@/lib/session";
import { Icon } from "@/components/icons";
import { PlatformIcon } from "@/components/platform-icon";
import { splitServiceName } from "@/lib/kinds";
import { db } from "@/lib/db";
import { num, som } from "@/lib/format";
import { ACTIVE, progressOf, statusOf } from "@/lib/order-view";
import { syncOrders } from "@/lib/orders";
import { platformOf } from "@/lib/platforms";
import { MascotState } from "@/components/mascot";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyurtmalarim" };

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
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

  const active = orders.filter((o) => ACTIVE.includes(o.status)).length;
  const done = orders.filter((o) => o.status === "COMPLETED" || o.status === "PARTIAL").length;
  const spent = orders.reduce((s, o) => s + o.charge - (o.refundAmount ?? 0), 0);
  const delivered = orders.reduce((s, o) => s + progressOf(o).delivered, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-zinc-900">Buyurtmalarim</h1>
      <p className="mt-2 text-zinc-500">Batafsil körish uçun buyurtmani bosing. Bajarilmagan qism uçun pul avtomatik qaytadi.</p>

      {orders.length === 0 ? (
        <div className="mt-4 text-zinc-900">
          <MascotState
            pose="empty-orders"
            size={240}
            className="mascot-page"
            title="Hali buyurtma yöq"
            message="Birinçi buyurtmangizni bir daqiqada bering."
          >
            <a href="/" className="btn-primary">Xizmat tanlaş</a>
          </MascotState>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Jami buyurtma", value: num(orders.length), icon: "package" as const },
              { label: "Bajarilmoqda", value: num(active), icon: "clock" as const },
              { label: "Yetkazildi", value: num(delivered), sub: `${num(done)} ta buyurtmada`, icon: "check" as const },
              { label: "Sarflandi", value: som(spent), icon: "wallet" as const },
            ].map((s) => (
              <div key={s.label} className="card p-4">
                <span className="flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-zinc-500">
                  <Icon name={s.icon} className="h-3.5 w-3.5" />
                  {s.label}
                </span>
                <p className="mt-1.5 truncate font-display text-xl font-bold tabular-nums text-zinc-900">{s.value}</p>
                {s.sub && <p className="text-xs text-zinc-400">{s.sub}</p>}
              </div>
            ))}
          </div>

          <ul className="mt-6 space-y-3">
            {orders.map((o) => {
              const p = platformOf(o.service.platform);
              const st = statusOf(o.status);
              const pr = progressOf(o);
              const showBar = o.status !== "FAILED" && o.status !== "CANCELED";
              return (
                <li key={o.id}>
                  <Link
                    href={`/orders/${o.id}`}
                    className="card glow-card group flex items-center gap-4 p-4 transition hover:-translate-y-0.5 sm:p-5"
                    style={{ "--glow": p.to } as React.CSSProperties}
                  >
                    <span
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white"
                      style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                    >
                      <PlatformIcon platform={p.key} className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-1 font-medium text-zinc-900">{splitServiceName(o.service.name).title}</p>
                        <span className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-zinc-500">
                        <span className="tabular-nums">{num(o.quantity)} dona</span>
                        <span className="tabular-nums">{som(o.charge)}</span>
                        <span className="text-zinc-400">{dateFmt.format(o.createdAt)}</span>
                      </div>
                      {showBar && (
                        <div className="mt-2.5 flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
                            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${pr.pct}%` }} />
                          </div>
                          <span className="w-24 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                            {num(pr.delivered)} / {num(o.quantity)}
                          </span>
                        </div>
                      )}
                    </div>
                    <Icon name="arrow-right" className="h-4 w-4 shrink-0 text-zinc-300 transition group-hover:translate-x-0.5 group-hover:text-zinc-500" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
