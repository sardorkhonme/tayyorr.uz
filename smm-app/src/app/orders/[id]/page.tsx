import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { currentUser, loginUrl } from "@/lib/session";
import { Icon, type IconName } from "@/components/icons";
import { OrderAutoRefresh } from "@/components/order-auto-refresh";
import { OrderRefreshButton } from "@/components/order-refresh-button";
import { PlatformIcon } from "@/components/platform-icon";
import { SupportLink } from "@/components/support-link";
import { KINDS, kindOf, splitServiceName } from "@/lib/kinds";
import { db } from "@/lib/db";
import { num, som } from "@/lib/format";
import { ACTIVE, progressOf, statusOf } from "@/lib/order-view";
import { syncOrders } from "@/lib/orders";
import { platformOf } from "@/lib/platforms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Buyurtma" };

const dateFmt = new Intl.DateTimeFormat("ru-RU", {
  timeZone: "Asia/Tashkent",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const RING = 2 * Math.PI * 52;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect(await loginUrl(`/orders/${id}`));

  await syncOrders(user.id);
  const o = await db.smmOrder.findFirst({
    where: { id, userId: user.id },
    include: { service: { select: { name: true, platform: true, category: true, refill: true } } },
  });
  if (!o) notFound();

  const txns = await db.walletTransaction.findMany({
    where: { userId: user.id, meta: { path: ["smmOrderId"], equals: o.id } },
    orderBy: { createdAt: "asc" },
    select: { id: true, type: true, amount: true, createdAt: true },
  });

  const p = platformOf(o.service.platform);
  const kind = KINDS.find((k) => k.key === kindOf(o.service.category, o.service.name)) ?? KINDS[KINDS.length - 1];
  const { title, tags } = splitServiceName(o.service.name);
  const st = statusOf(o.status);
  const pr = progressOf(o);
  const active = ACTIVE.includes(o.status);
  const failed = o.status === "FAILED" || o.status === "CANCELED";
  const paid = o.charge - (o.refundAmount ?? 0);
  const per1000 = Math.round((o.charge / o.quantity) * 1000);

  const stats: { label: string; value: string; sub?: string; icon: IconName }[] = [
    { label: "Buyurtma", value: `${num(o.quantity)} ta`, sub: kind.label.toLowerCase(), icon: "package" },
    { label: "Yetkazildi", value: `${num(pr.delivered)} ta`, sub: `${pr.pct}%`, icon: "check" },
    { label: "Qoldi", value: `${num(pr.left)} ta`, sub: active ? "yetkazilmoqda" : failed || o.status === "PARTIAL" ? "puli qaytarildi" : "—", icon: "clock" },
    {
      label: "Boşlanişida",
      value: o.startCount != null && o.startCount >= 0 ? num(o.startCount) : "—",
      sub: o.startCount != null ? "buyurtmadan oldin edi" : "hali ma'lum emas",
      icon: "eye",
    },
    {
      label: "Hozir taxminan",
      value: pr.expected != null ? num(pr.expected) : "—",
      sub: pr.expected != null ? "boşlanişi + yetkazilgan" : "boşlanğaç körinadi",
      icon: "sparkles",
    },
    { label: "1000 tasi narxi", value: som(per1000), sub: `jami: ${som(o.charge)}`, icon: "tag" },
  ];

  const steps = [
    { label: "Buyurtma berildi", time: o.createdAt, done: true },
    { label: "Qabul qilindi", done: o.providerOrderId != null && !failed },
    {
      label: "Yetkazilmoqda",
      done: ["IN_PROGRESS", "COMPLETED", "PARTIAL"].includes(o.status),
      current: o.status === "IN_PROGRESS",
    },
    {
      label: failed ? st.label : o.status === "PARTIAL" ? "Qisman bajarildi" : "Bajarildi",
      time: active ? undefined : o.updatedAt,
      done: !active,
      bad: failed,
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      {active && <OrderAutoRefresh />}

      <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition hover:text-zinc-900">
        <Icon name="arrow-left" className="h-4 w-4" />
        Buyurtmalarim
      </Link>

      {/* sarlavha */}
      <div className="card mt-4 overflow-hidden !rounded-3xl">
        <div className="relative px-4 py-5 text-white sm:px-7 sm:py-6" style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}>
          <div className="flex items-start gap-3 sm:gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/20 backdrop-blur sm:h-14 sm:w-14">
              <PlatformIcon platform={p.key} className="h-6 w-6 sm:h-7 sm:w-7" />
            </span>
            <div className="min-w-0 flex-1">
              {/* telefonda holat nishoni platforma nomi yonida — sarlavhaga to'liq kenglik qoladi */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-white/80">
                  {p.name} · {kind.label}
                </p>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold sm:hidden ${st.cls}`}>{st.label}</span>
              </div>
              <h1 className="mt-0.5 break-words font-display text-lg font-bold leading-snug sm:text-2xl">{title}</h1>
              <p className="mt-1 text-xs text-white/70">
                Buyurtma #{o.id.slice(-8).toUpperCase()} · {dateFmt.format(o.createdAt)}
              </p>
            </div>
            <span className={`hidden shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${st.cls}`}>{st.label}</span>
          </div>
        </div>

        {/* bajarilish */}
        <div className="flex flex-col items-center gap-5 px-4 py-5 sm:flex-row sm:gap-6 sm:px-7 sm:py-6">
          <div className="relative h-32 w-32 shrink-0 sm:h-36 sm:w-36">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" className="stroke-zinc-100" strokeWidth="10" />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke={failed ? "#f87171" : `url(#ring-${o.id})`}
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={RING}
                strokeDashoffset={RING * (1 - pr.pct / 100)}
              />
              <defs>
                <linearGradient id={`ring-${o.id}`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor={p.from} />
                  <stop offset="100%" stopColor={p.to} />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 grid place-content-center text-center">
              <span className="font-display text-3xl font-bold tabular-nums text-zinc-900">{pr.pct}%</span>
              <span className="text-xs text-zinc-500">bajarildi</span>
            </div>
          </div>
          <div className="w-full min-w-0 flex-1">
            <p className="text-center font-display text-2xl font-bold tabular-nums text-zinc-900 sm:text-left">
              {num(pr.delivered)} <span className="text-zinc-400">/ {num(o.quantity)}</span>
            </p>
            <p className="mt-1 text-center text-sm text-zinc-500 sm:text-left">{st.hint}</p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-zinc-100">
              <div className={`h-full rounded-full ${st.bar} transition-all`} style={{ width: `${pr.pct}%` }} />
            </div>
            {o.refundAmount ? (
              <p className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-medium text-emerald-700">
                <Icon name="wallet" className="h-4 w-4" />
                Hamyonga qaytarildi: {som(o.refundAmount)}
              </p>
            ) : null}
            {active && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 sm:justify-start">
                <OrderRefreshButton orderId={o.id} />
                {o.checkedAt && <p className="text-xs text-zinc-400">Oxirgi tekşiruv: {dateFmt.format(o.checkedAt)}</p>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* statistika */}
      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card min-w-0 p-3.5 sm:p-4">
            <span className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
              <Icon name={s.icon} className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{s.label}</span>
            </span>
            <p className="mt-1.5 break-words font-display text-lg font-bold tabular-nums text-zinc-900 sm:text-xl">{s.value}</p>
            {s.sub && <p className="break-words text-xs text-zinc-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {/* jarayon */}
        <div className="card min-w-0 p-4 sm:p-5">
          <h2 className="font-semibold text-zinc-900">Jarayon</h2>
          <ol className="mt-4 space-y-0">
            {steps.map((s, i) => (
              <li key={s.label} className="relative flex gap-3 pb-5 last:pb-0">
                {i < steps.length - 1 && (
                  <span className={`absolute left-[11px] top-6 h-[calc(100%-1.25rem)] w-0.5 ${steps[i + 1].done ? "bg-indigo-200" : "bg-zinc-100"}`} />
                )}
                <span
                  className={`relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-white ${
                    s.bad ? "bg-red-400" : s.done ? "bg-indigo-500" : s.current ? "bg-indigo-100" : "bg-zinc-100"
                  }`}
                >
                  {s.done ? (
                    <Icon name={s.bad ? "close" : "check"} className="h-3.5 w-3.5" />
                  ) : s.current ? (
                    <span className="h-2 w-2 animate-pulse rounded-full bg-indigo-500" />
                  ) : null}
                </span>
                <div className="-mt-0.5">
                  <p className={`text-sm font-medium ${s.done || s.current ? "text-zinc-900" : "text-zinc-400"}`}>{s.label}</p>
                  {s.time && <p className="text-xs text-zinc-400">{dateFmt.format(s.time)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* havola va xizmat */}
        <div className="card flex min-w-0 flex-col gap-4 p-4 sm:p-5">
          <div>
            <h2 className="font-semibold text-zinc-900">Havola</h2>
            <a
              href={o.link}
              target="_blank"
              rel="noreferrer"
              className="mt-2 flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2.5 text-sm text-zinc-700 transition hover:border-indigo-300 hover:text-indigo-700"
            >
              <span className="min-w-0 flex-1 truncate">{o.link}</span>
              <Icon name="external" className="h-4 w-4 shrink-0" />
            </a>
          </div>
          <div>
            <h2 className="font-semibold text-zinc-900">Xizmat haqida</h2>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {o.service.refill && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <Icon name="shield" className="h-3.5 w-3.5" />
                  Kafolatli
                </span>
              )}
              {tags.map((t) => (
                <span key={t} className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-600">
                  {t}
                </span>
              ))}
              {!o.service.refill && tags.length === 0 && <span className="text-sm text-zinc-400">Qöşimça ma'lumot yöq</span>}
            </div>
          </div>
          {txns.length > 0 && (
            <div>
              <h2 className="font-semibold text-zinc-900">Hamyon</h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {txns.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-zinc-500">
                      {t.type === "REFUND" ? "Qaytarildi" : "Töländi"} · {dateFmt.format(t.createdAt)}
                    </span>
                    <span className={`font-medium tabular-nums ${t.type === "REFUND" ? "text-emerald-700" : "text-zinc-900"}`}>
                      {t.type === "REFUND" ? "+" : "−"}
                      {som(t.amount)}
                    </span>
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-1.5 font-semibold">
                  <span className="text-zinc-900">Jami sarflandi</span>
                  <span className="tabular-nums text-zinc-900">{som(paid)}</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="card mt-4 flex flex-col items-stretch justify-between gap-3 p-4 sm:flex-row sm:items-center sm:p-5">
        <div>
          <p className="font-medium text-zinc-900">Buyurtma bilan muammo bormi?</p>
          <p className="text-sm text-zinc-500">Buyurtma raqamini yozib supportga murojaat qiling — tez yordam beramiz.</p>
        </div>
        <SupportLink className="btn-primary shrink-0">
          <Icon name="headset" className="h-4 w-4" />
          Supportga yoziş
        </SupportLink>
      </div>
    </div>
  );
}
