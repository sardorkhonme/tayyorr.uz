import Link from "next/link";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { shortDateTime } from "@/lib/date";
import { getSmmSettings, refreshSmmUsdRate } from "@/lib/smm-settings";
import { SmmSettingsForm } from "@/components/admin/smm-settings-form";
import { Icon } from "@/components/icons";

export const dynamic = "force-dynamic";

const SMM_URL = process.env.SMM_SITE_URL || "https://plus.tayyorr.uz";

const STATUS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Navbatda", cls: "text-zinc-300" },
  PROCESSING: { label: "Qabul qilindi", cls: "text-sky-300" },
  IN_PROGRESS: { label: "Bajarilmoqda", cls: "text-indigo-300" },
  COMPLETED: { label: "Bajarildi", cls: "text-emerald-300" },
  PARTIAL: { label: "Qisman", cls: "text-amber-300" },
  CANCELED: { label: "Bekor", cls: "text-red-300" },
  FAILED: { label: "Xatolik", cls: "text-red-300" },
};

const som = (n: number) => `${n.toLocaleString("ru-RU")} söm`;

export default async function AdminSmm() {
  await requireAdmin();

  let settings = await getSmmSettings();
  if (!settings.usd) {
    await refreshSmmUsdRate();
    settings = await getSmmSettings();
  }

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);
  const [total, today, charged, refunded, services, orders] = await Promise.all([
    db.smmOrder.count(),
    db.smmOrder.count({ where: { createdAt: { gte: dayAgo } } }),
    db.smmOrder.aggregate({ _sum: { charge: true } }),
    db.smmOrder.aggregate({ _sum: { refundAmount: true } }),
    db.smmService.count({ where: { active: true } }),
    db.smmOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        user: { select: { id: true, name: true, login: true } },
        service: { select: { name: true } },
      },
    }),
  ]);
  const turnover = (charged._sum.charge ?? 0) - (refunded._sum.refundAmount ?? 0);

  const stats = [
    { label: "Buyurtmalar", value: total.toLocaleString("ru-RU"), sub: `24 soatda: ${today}` },
    { label: "Aylanma (qaytarilganlarsiz)", value: som(turnover), sub: "mijozlar tölagan summa" },
    { label: "Faol xizmatlar", value: services.toLocaleString("ru-RU"), sub: "provayderdan 6 soatda avtomatik yangilanadi" },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/plus-mark.png" alt="" className="h-7 w-7 object-contain" />
          tayyorr+
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          <a href={SMM_URL} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
            {SMM_URL.replace(/^https?:\/\//, "")}
          </a>{" "}
          — narx sozlamalari va buyurtmalar.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <span className="flex items-center gap-1.5 text-sm text-zinc-400">
            <Icon name="banknote" className="h-4 w-4" />
            Dollar kursi (Markaziy bank)
          </span>
          <span className="mt-1 text-3xl font-semibold text-white">
            {settings.usd ? `${settings.usd.rate.toLocaleString("ru-RU")} söm` : "—"}
          </span>
          <span className="text-xs text-zinc-500">
            {settings.usd
              ? `CBU sanasi: ${settings.usd.date ?? "—"} · yangilangan: ${shortDateTime(settings.usd.at)}`
              : "Kursni olib bölmadi"}
          </span>
          <span className="mt-2 text-xs text-zinc-600">Har 6 soatda avtomatik yangilanadi.</span>
        </div>
        <SmmSettingsForm
          markupPercent={settings.markupPercent}
          markupIsDefault={settings.markupIsDefault}
          fx={settings.usd?.rate ?? null}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="text-sm text-zinc-400">{s.label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{s.value}</div>
            <div className="mt-1 text-xs text-zinc-500">{s.sub}</div>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold text-white">Oxirgi buyurtmalar</h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2">Sana</th>
                <th className="px-4 py-2">Foydalanuvçi</th>
                <th className="px-4 py-2">Xizmat</th>
                <th className="px-4 py-2 text-right">Miqdor</th>
                <th className="px-4 py-2 text-right">Summa</th>
                <th className="px-4 py-2">Holat</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const st = STATUS[o.status] ?? STATUS.PENDING;
                return (
                  <tr key={o.id} className="border-t border-white/5 align-top">
                    <td className="whitespace-nowrap px-4 py-2 text-zinc-400">{shortDateTime(o.createdAt)}</td>
                    <td className="px-4 py-2">
                      <Link href={`/users/${o.user.id}`} className="text-indigo-400 hover:underline">
                        {o.user.name ?? "—"} <span className="text-zinc-500">@{o.user.login ?? "—"}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-zinc-300">
                      <div className="line-clamp-2 max-w-xs">{o.service.name}</div>
                      <a href={o.link} target="_blank" rel="noreferrer" className="block max-w-xs truncate text-xs text-zinc-500 hover:text-zinc-300">
                        {o.link}
                      </a>
                    </td>
                    <td className="px-4 py-2 text-right text-zinc-300">{o.quantity.toLocaleString("ru-RU")}</td>
                    <td className="whitespace-nowrap px-4 py-2 text-right text-zinc-300">
                      {som(o.charge)}
                      {o.refundAmount ? <div className="text-xs text-emerald-400">−{som(o.refundAmount)}</div> : null}
                    </td>
                    <td className={`whitespace-nowrap px-4 py-2 ${st.cls}`}>
                      {st.label}
                      {o.error && <div className="max-w-[12rem] truncate text-xs text-zinc-500">{o.error}</div>}
                    </td>
                  </tr>
                );
              })}
              {orders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                    Hali buyurtma yöq.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
