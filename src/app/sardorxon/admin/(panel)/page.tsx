import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { SupportProfileForm } from "@/components/admin/support-profile-form";
import {
  HEAR_ABOUT_US_LABELS,
  ChannelBrandIcon,
} from "@/components/hear-about-us-select";

export default async function AdminHome() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [users, openComplaints, txnToday, balanceAgg, banned, pendingPayouts, platform, hearAboutUsRaw] =
    await Promise.all([
      db.user.count({ where: { isSupport: false, isPlatform: false } }),
      db.complaint.count({ where: { status: { in: ["OPEN", "REVIEWING"] } } }),
      db.walletTransaction.count({ where: { createdAt: { gte: since } } }),
      db.user.aggregate({ _sum: { balance: true } }),
      db.user.count({ where: { bannedUntil: { gt: new Date() } } }),
      db.payoutRequest.count({ where: { status: "PENDING" } }),
      db.user.findFirst({ where: { isPlatform: true }, select: { balance: true } }),
      db.$queryRaw<{ hearAboutUs: string; _count: bigint }[]>`
        SELECT "hearAboutUs", COUNT(*)::bigint AS "_count"
        FROM "User"
        WHERE "hearAboutUs" IS NOT NULL AND "isSupport" = false
        GROUP BY "hearAboutUs"
        ORDER BY "_count" DESC
      `,
    ]);

  // bigint -> number
  const hearAboutUsStats = hearAboutUsRaw.map((r) => ({
    key: r.hearAboutUs,
    label: HEAR_ABOUT_US_LABELS[r.hearAboutUs] ?? r.hearAboutUs,
    count: Number(r._count),
  }));
  const hearTotal = hearAboutUsStats.reduce((s, r) => s + r.count, 0);

  const cards = [
    { label: "Foydalanuvchilar", value: users, href: "/sardorxon/admin/users" },
    {
      label: "Ochiq shikoyatlar",
      value: openComplaints,
      href: "/sardorxon/admin/complaints",
    },
    {
      label: "Yechib olish (kutilmoqda)",
      value: pendingPayouts,
      href: "/sardorxon/admin/payouts",
    },
    { label: "24 soatlik amallar", value: txnToday, href: "/sardorxon/admin/payments" },
    { label: "Cheklangan hisoblar", value: banned, href: "/sardorxon/admin/users" },
    {
      label: "Sayt daromadi — star (jami)",
      value: formatSom(platform?.balance ?? 0),
      href: "/sardorxon/admin/payments",
    },
    {
      label: "Umumiy balans",
      value: formatSom(balanceAgg._sum.balance ?? 0),
      href: "/sardorxon/admin/payments",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold text-white">Boshqaruv paneli</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-5 transition hover:bg-white/[0.06]"
          >
            <div className="text-2xl font-semibold text-white">{c.value}</div>
            <div className="mt-1 text-sm text-zinc-500">{c.label}</div>
          </Link>
        ))}
      </div>

      {/* «Qayerdan eshitgan» statistikasi */}
      {hearAboutUsStats.length > 0 && (
        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 font-semibold text-white">
            📊 Qayerdan eshitgan — statistika
          </h2>
          <div className="flex flex-col gap-3">
            {hearAboutUsStats.map((s) => {
              const pct = hearTotal > 0 ? Math.round((s.count / hearTotal) * 100) : 0;
              return (
                <div key={s.key}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-zinc-300">
                      <ChannelBrandIcon name={s.key} className="h-4 w-4" />
                      <span>{s.label}</span>
                    </span>
                    <span className="font-mono text-white">
                      {s.count}{" "}
                      <span className="text-zinc-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-zinc-600">
            Jami javob: {hearTotal} · {users - hearTotal} foydalanuvchi hali javob bermagan
          </p>
        </section>
      )}

      <SupportProfileForm />
    </div>
  );
}
