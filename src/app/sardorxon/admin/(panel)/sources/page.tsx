import Link from "next/link";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";

export const dynamic = "force-dynamic";

const CHANNEL_ICONS: Record<string, string> = {
  instagram: "📸",
  telegram: "✈️",
  ai: "🤖",
  google: "🔍",
  friend: "👥",
  other: "💬",
};

const CHANNELS = [
  { key: "all", label: "Barchasi", icon: "🌐" },
  { key: "instagram", label: "Instagram", icon: "📸" },
  { key: "telegram", label: "Telegram", icon: "✈️" },
  { key: "ai", label: "Suniy intellekt tavsiyasi", icon: "🤖" },
  { key: "google", label: "Google", icon: "🔍" },
  { key: "friend", label: "Do'stimdan", icon: "👥" },
  { key: "other", label: "Boshqa", icon: "💬" },
  { key: "referral", label: "Referral havola orqali", icon: "🔗" },
  { key: "unknown", label: "Ko'rsatilmagan", icon: "❓" },
];

export default async function AdminSourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ channel?: string; q?: string }>;
}) {
  const { channel = "all", q } = await searchParams;
  const query = q?.trim();

  // Barcha ro'yxatdan o'tganlar (support va platform hisoblari hisobga olinmaydi)
  const totalUsers = await db.user.count({
    where: { isSupport: false, isPlatform: false },
  });

  // Har bir kanal bo'yicha statistika
  const rawCounts = await db.$queryRaw<{ hearAboutUs: string | null; _count: bigint }[]>`
    SELECT "hearAboutUs", COUNT(*)::bigint AS "_count"
    FROM "User"
    WHERE "isSupport" = false AND "isPlatform" = false
    GROUP BY "hearAboutUs"
  `;

  // Referral havola orqali kelganlar soni
  const referralCount = await db.user.count({
    where: {
      isSupport: false,
      isPlatform: false,
      referralLinkId: { not: null },
    },
  });

  const countsMap: Record<string, number> = {};
  let answeredTotal = 0;
  for (const row of rawCounts) {
    const key = row.hearAboutUs ?? "unknown";
    const count = Number(row._count);
    countsMap[key] = count;
    if (row.hearAboutUs) {
      answeredTotal += count;
    }
  }

  // Filtr bo'yicha foydalanuvchilarni olish
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    isSupport: false,
    isPlatform: false,
  };

  if (channel === "referral") {
    where.referralLinkId = { not: null };
  } else if (channel === "unknown") {
    where.hearAboutUs = null;
  } else if (channel !== "all") {
    where.hearAboutUs = channel;
  }

  if (query) {
    where.OR = [
      { firstName: { contains: query, mode: "insensitive" } },
      { lastName: { contains: query, mode: "insensitive" } },
      { login: { contains: query, mode: "insensitive" } },
      { email: { contains: query, mode: "insensitive" } },
    ];
  }

  const users = await db.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      referralLink: { select: { id: true, name: true, code: true } },
      referredBy: { select: { id: true, name: true, login: true } },
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-white">
          Qayerdan eshitgan — Statistika va manbalar
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          Foydalanuvchilar Tayyorr.uz haqida qayerdan eshitgani va qaysi referral
          havolalardan ro'yxatdan o'tganining to'liq tahlili.
        </p>
      </div>

      {/* Statistika kartochkalari */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {CHANNELS.filter((c) => c.key !== "all").map((c) => {
          let count = 0;
          if (c.key === "referral") {
            count = referralCount;
          } else {
            count = countsMap[c.key] ?? 0;
          }
          const pct = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
          const isActive = channel === c.key;

          return (
            <Link
              key={c.key}
              href={`/sardorxon/admin/sources?channel=${c.key}`}
              className={`rounded-xl border p-4 transition ${
                isActive
                  ? "border-indigo-400/80 bg-indigo-500/15"
                  : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xl">{c.icon}</span>
                <span className="text-xs font-semibold text-zinc-400">{pct}%</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-zinc-400">{c.label}</div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-indigo-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Filtr tablari va qidiruv */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map((c) => {
            const isActive = channel === c.key;
            let count = totalUsers;
            if (c.key === "referral") count = referralCount;
            else if (c.key !== "all") count = countsMap[c.key] ?? 0;

            return (
              <Link
                key={c.key}
                href={`/sardorxon/admin/sources?channel=${c.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? "border-indigo-400 bg-indigo-500/20 text-white"
                    : "border-white/10 bg-white/[0.02] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                }`}
              >
                <span>{c.icon}</span>
                <span>{c.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    isActive ? "bg-indigo-400/30 text-white" : "bg-white/10 text-zinc-400"
                  }`}
                >
                  {count}
                </span>
              </Link>
            );
          })}
        </div>

        <form method="GET" className="flex gap-2">
          <input type="hidden" name="channel" value={channel} />
          <input
            type="text"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Foydalanuvchi qidirish (ism, login, email)..."
            className="input text-sm"
          />
          <button type="submit" className="btn-secondary whitespace-nowrap text-sm">
            Qidirish
          </button>
          {query && (
            <Link
              href={`/sardorxon/admin/sources?channel=${channel}`}
              className="btn-secondary flex items-center justify-center text-sm"
            >
              Tozalash
            </Link>
          )}
        </form>
      </div>

      {/* Foydalanuvchilar ro'yxati jadvali */}
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2.5">Foydalanuvchi</th>
              <th className="px-4 py-2.5">Qayerdan eshitgan</th>
              <th className="px-4 py-2.5">Referral havola</th>
              <th className="px-4 py-2.5">Kim taklif qilgan</th>
              <th className="px-4 py-2.5">Rol</th>
              <th className="px-4 py-2.5">Sana</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const hearKey = u.hearAboutUs;
              const hearLabel = hearKey
                ? HEAR_ABOUT_US_LABELS[hearKey] ?? hearKey
                : null;
              const hearIcon = hearKey ? CHANNEL_ICONS[hearKey] ?? "💬" : null;

              return (
                <tr key={u.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/sardorxon/admin/users/${u.id}`}
                      className="font-medium text-white hover:text-indigo-300 hover:underline"
                    >
                      {u.name || `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "—"}{" "}
                      <span className="text-zinc-500">@{u.login ?? "—"}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-2.5">
                    {hearLabel ? (
                      <span className="inline-flex items-center gap-1.5 rounded-md border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-xs text-indigo-300">
                        <span>{hearIcon}</span>
                        <span>{hearLabel}</span>
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-600">ko'rsatilmagan</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.referralLink ? (
                      <Link
                        href={`/sardorxon/admin/referrals/${u.referralLink.id}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                      >
                        <span>🔗</span>
                        <span>{u.referralLink.name}</span>
                        <span className="font-mono text-zinc-500">
                          ({u.referralLink.code})
                        </span>
                      </Link>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {u.referredBy ? (
                      <Link
                        href={`/sardorxon/admin/users/${u.referredBy.id}`}
                        className="text-xs text-indigo-400 hover:underline"
                      >
                        @{u.referredBy.login ?? u.referredBy.name}
                      </Link>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-400">
                    {u.role === "PREPARER"
                      ? "Tayyorlovchi"
                      : u.role === "ORDERER"
                        ? "Buyurtmachi"
                        : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-zinc-500">
                    {shortDateTime(u.createdAt)}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-zinc-500">
                  Foydalanuvchi topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

