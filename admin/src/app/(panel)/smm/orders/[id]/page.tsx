import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { shortDate, shortDateTime } from "@/lib/date";
import { formatSom as som } from "@/lib/wallet";
import { getSmmSettings } from "@/lib/smm-settings";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";
import { Icon, type IconName } from "@/components/icons";
import { SmmOrderRefresh } from "@/components/admin/smm-order-refresh";

export const dynamic = "force-dynamic";

const STATUS: Record<string, { label: string; cls: string; bar: string }> = {
  PENDING: { label: "Navbatda", cls: "bg-zinc-500/15 text-zinc-300", bar: "bg-zinc-400" },
  PROCESSING: { label: "Qabul qilindi", cls: "bg-sky-500/15 text-sky-300", bar: "bg-sky-400" },
  IN_PROGRESS: { label: "Bajarilmoqda", cls: "bg-indigo-500/15 text-indigo-300", bar: "bg-indigo-400" },
  COMPLETED: { label: "Bajarildi", cls: "bg-emerald-500/15 text-emerald-300", bar: "bg-emerald-400" },
  PARTIAL: { label: "Qisman", cls: "bg-amber-500/15 text-amber-300", bar: "bg-amber-400" },
  CANCELED: { label: "Bekor", cls: "bg-red-500/15 text-red-300", bar: "bg-red-400" },
  FAILED: { label: "Xatolik", cls: "bg-red-500/15 text-red-300", bar: "bg-red-400" },
};

const n = (v: number) => v.toLocaleString("ru-RU");

/** smm-app/src/lib/order-view.ts progressOf bilan bir xil hisob. */
function progressOf(o: { quantity: number; remains: number | null; startCount: number | null; status: string }) {
  let delivered = o.remains != null ? o.quantity - Math.max(o.remains, 0) : o.status === "COMPLETED" ? o.quantity : 0;
  delivered = Math.min(Math.max(delivered, 0), o.quantity);
  return {
    delivered,
    left: o.quantity - delivered,
    pct: o.quantity > 0 ? Math.round((delivered / o.quantity) * 100) : 0,
    expected: o.startCount != null && o.startCount >= 0 ? o.startCount + delivered : null,
  };
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="shrink-0 text-zinc-500">{label}</span>
      <span className="min-w-0 text-right text-zinc-200">{children}</span>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: IconName; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="flex items-center gap-2 font-semibold text-white">
        <Icon name={icon} className="h-4 w-4 text-zinc-400" />
        {title}
      </h2>
      <div className="mt-2 divide-y divide-white/5">{children}</div>
    </section>
  );
}

export default async function AdminSmmOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const o = await db.smmOrder.findUnique({
    where: { id },
    include: {
      service: true,
      user: {
        select: {
          id: true,
          name: true,
          firstName: true,
          lastName: true,
          login: true,
          email: true,
          avatarUrl: true,
          image: true,
          balance: true,
          walletCode: true,
          telegramUsername: true,
          hearAboutUs: true,
          hearAboutUsDetail: true,
          bannedUntil: true,
          lastSeenAt: true,
          createdAt: true,
          referredBy: { select: { id: true, name: true, login: true } },
          referralLink: { select: { name: true } },
        },
      },
    },
  });
  if (!o) notFound();

  const [settings, txns, logs, userAgg, userDone, otherOrders] = await Promise.all([
    getSmmSettings(),
    db.walletTransaction.findMany({
      where: { userId: o.userId, meta: { path: ["smmOrderId"], equals: o.id } },
      orderBy: { createdAt: "asc" },
    }),
    db.activityLog.findMany({
      where: { userId: o.userId, meta: { path: ["smmOrderId"], equals: o.id } },
      orderBy: { createdAt: "asc" },
    }),
    db.smmOrder.aggregate({ where: { userId: o.userId }, _count: true, _sum: { charge: true, refundAmount: true } }),
    db.smmOrder.count({ where: { userId: o.userId, status: { in: ["COMPLETED", "PARTIAL"] } } }),
    db.smmOrder.findMany({
      where: { userId: o.userId, id: { not: o.id } },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { service: { select: { name: true } } },
    }),
  ]);

  const st = STATUS[o.status] ?? STATUS.PENDING;
  const pr = progressOf(o);
  const net = o.charge - (o.refundAmount ?? 0);
  const fx = settings.usd?.rate ?? null;
  // provayder xarajati — xizmatning hozirgi narxi bo'yicha, faqat yetkazilgan qism (taxminiy)
  const costUsd = (o.service.providerRate * pr.delivered) / 1000;
  const costUzs = fx ? Math.round(costUsd * fx) : null;
  const profit = costUzs != null ? net - costUzs : null;
  const u = o.user;
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(" ") || u.name || "—";
  const avatar = u.avatarUrl || u.image;
  const userSpent = (userAgg._sum.charge ?? 0) - (userAgg._sum.refundAmount ?? 0);

  const stats = [
    { label: "Buyurtma", value: n(o.quantity) },
    { label: "Yetkazildi", value: `${n(pr.delivered)} · ${pr.pct}%` },
    { label: "Qoldi", value: n(pr.left) },
    { label: "Boşlanişida", value: o.startCount != null && o.startCount >= 0 ? n(o.startCount) : "—" },
    { label: "Hozir taxminan", value: pr.expected != null ? n(pr.expected) : "—" },
    { label: "Mijoz töladi (sof)", value: som(net) },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/smm" className="text-sm text-zinc-500 transition hover:text-zinc-200">
        ← tayyorr+ buyurtmalari
      </Link>

      {/* sarlavha + bajarilish */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              {o.service.platform} · {o.service.category}
            </p>
            <h1 className="mt-1 text-lg font-semibold leading-snug text-white">{o.service.name}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              #{o.id.slice(-8).toUpperCase()} · {shortDateTime(o.createdAt)}
            </p>
          </div>
          <span className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {/* faol buyurtma — provayderdan hozir so'rash; yakunlangani o'zgarmaydi */}
            {["PROCESSING", "IN_PROGRESS"].includes(o.status) && o.providerOrderId && <SmmOrderRefresh orderId={o.id} />}
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${st.cls}`}>{st.label}</span>
          </span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${pr.pct}%` }} />
          </div>
          <span className="shrink-0 text-sm tabular-nums text-zinc-300">
            {n(pr.delivered)} / {n(o.quantity)} · {pr.pct}%
          </span>
        </div>
        {o.error && (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">Xato: {o.error}</p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white/[0.03] p-3">
              <div className="text-xs text-zinc-500">{s.label}</div>
              <div className="mt-1 font-semibold tabular-nums text-white">{s.value}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* foydalanuvchi */}
        <Panel title="Foydalanuvçi" icon="user">
          <div className="flex items-center gap-3 py-3">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-11 w-11 rounded-full object-cover" />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-full bg-white/10 text-zinc-300">
                <Icon name="user" className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-white">{fullName}</p>
              <p className="truncate text-sm text-zinc-500">@{u.login ?? "—"}</p>
            </div>
            <Link
              href={`/users/${u.id}`}
              className="shrink-0 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Profil →
            </Link>
          </div>
          <Row label="Email">{u.email ?? "—"}</Row>
          <Row label="Telegram">{u.telegramUsername ? `@${u.telegramUsername}` : "ulanmagan"}</Row>
          <Row label="Hamyon">
            {som(u.balance)} {u.walletCode && <span className="text-zinc-500">· {u.walletCode}</span>}
          </Row>
          <Row label="Röyxatdan ötgan">{shortDate(u.createdAt)}</Row>
          <Row label="Oxirgi faollik">{u.lastSeenAt ? shortDateTime(u.lastSeenAt) : "—"}</Row>
          <Row label="Qayerdan eşitgan">
            {u.hearAboutUs ? HEAR_ABOUT_US_LABELS[u.hearAboutUs] ?? u.hearAboutUs : "—"}
            {u.hearAboutUsDetail && <span className="text-zinc-500"> · {u.hearAboutUsDetail}</span>}
          </Row>
          {(u.referredBy || u.referralLink) && (
            <Row label="Taklif qilgan">
              {u.referredBy ? (
                <Link href={`/users/${u.referredBy.id}`} className="text-indigo-400 hover:underline">
                  {u.referredBy.name ?? `@${u.referredBy.login}`}
                </Link>
              ) : (
                u.referralLink?.name
              )}
            </Row>
          )}
          {u.bannedUntil && u.bannedUntil > new Date() && (
            <Row label="Çeklangan">
              <span className="text-red-300">{shortDateTime(u.bannedUntil)} gaça</span>
            </Row>
          )}
          <Row label="SMM buyurtmalari">
            {n(userAgg._count)} ta · bajarilgan {n(userDone)} · sarflagan {som(userSpent)}
          </Row>
        </Panel>

        {/* provayder va moliya */}
        <Panel title="Provayder va foyda" icon="coins">
          <Row label="Provayder buyurtma ID">{o.providerOrderId ?? <span className="text-zinc-500">yuborilmagan</span>}</Row>
          <Row label="Provayder xizmat ID">{o.service.providerId}</Row>
          <Row label="Provayder narxi (1000)">${o.service.providerRate}</Row>
          <Row label="Sotuv narxi (1000)">{som(Math.round((o.charge / o.quantity) * 1000))}</Row>
          <Row label="Yeçildi / qaytarildi">
            {som(o.charge)} / {som(o.refundAmount ?? 0)}
          </Row>
          <Row label="Provayder xarajati">
            ${costUsd.toFixed(4)}
            {costUzs != null && <span className="text-zinc-500"> ≈ {som(costUzs)}</span>}
          </Row>
          <Row label="Foyda (taxminiy)">
            {profit != null ? (
              <span className={profit >= 0 ? "text-emerald-300" : "text-red-300"}>{som(profit)}</span>
            ) : (
              "—"
            )}
          </Row>
          <Row label="Kafolat (refill)">{o.service.refill ? "bor" : "yöq"}</Row>
          <Row label="Oxirgi tekşiruv">{o.checkedAt ? shortDateTime(o.checkedAt) : "—"}</Row>
          <Row label="Oxirgi özgariş">{shortDateTime(o.updatedAt)}</Row>
          <p className="pt-2 text-xs text-zinc-600">
            Xarajat xizmatning hozirgi provayder narxi va CBU kursi böyiça, faqat yetkazilgan qism uçun hisoblangan.
          </p>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Havola" icon="link">
          <a href={o.link} target="_blank" rel="noreferrer" className="block break-all py-3 text-sm text-indigo-400 hover:underline">
            {o.link}
          </a>
        </Panel>

        <Panel title="Hamyon harakatlari" icon="wallet">
          {txns.length === 0 && <p className="py-2 text-sm text-zinc-500">Yöq</p>}
          {txns.map((t) => (
            <Row key={t.id} label={`${t.type === "REFUND" ? "Qaytarildi" : "Yeçildi"} · ${shortDateTime(t.createdAt)}`}>
              <span className={t.type === "REFUND" ? "text-emerald-300" : ""}>
                {t.type === "REFUND" ? "+" : "−"}
                {som(t.amount)}
              </span>
            </Row>
          ))}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Faollik jurnali" icon="clock">
          {logs.length === 0 && <p className="py-2 text-sm text-zinc-500">Yöq</p>}
          {logs.map((l) => (
            <div key={l.id} className="py-2 text-sm">
              <p className="text-zinc-200">{l.summary}</p>
              <p className="text-xs text-zinc-500">
                {shortDateTime(l.createdAt)}
                {l.ip && ` · ${l.ip}`}
              </p>
              {l.userAgent && <p className="truncate text-xs text-zinc-600">{l.userAgent}</p>}
            </div>
          ))}
        </Panel>

        <Panel title="Foydalanuvçining boşqa buyurtmalari" icon="package">
          {otherOrders.length === 0 && <p className="py-2 text-sm text-zinc-500">Yöq</p>}
          {otherOrders.map((x) => {
            const s = STATUS[x.status] ?? STATUS.PENDING;
            return (
              <Link key={x.id} href={`/smm/orders/${x.id}`} className="flex items-center justify-between gap-3 py-2 text-sm hover:text-white">
                <span className="min-w-0 truncate text-zinc-300">{x.service.name}</span>
                <span className="flex shrink-0 items-center gap-2">
                  <span className="tabular-nums text-zinc-400">{som(x.charge)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${s.cls}`}>{s.label}</span>
                </span>
              </Link>
            );
          })}
        </Panel>
      </div>
    </div>
  );
}
