import Link from "next/link";

import { db } from "@/lib/db";
import { formatSom } from "@/lib/wallet";
import { shortDateTime } from "@/lib/date";
import { cleanQuery, userSearchWhere } from "@/lib/admin-search";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { LiveSearch } from "@/components/admin/live-search";
import { HEAR_ABOUT_US_LABELS } from "@/components/hear-about-us-select";

const CHANNEL_ICONS: Record<string, string> = {
  instagram: "📸",
  telegram: "✈️",
  ai: "🤖",
  google: "🔍",
  friend: "👥",
  other: "💬",
};

export default async function AdminUsers({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const query = cleanQuery((await searchParams).q);

  const users = await db.user.findMany({
    where: {
      isSupport: false,
      ...(query
        ? {
            OR: [
              userSearchWhere(query),
              { email: { contains: query, mode: "insensitive" } },
              { walletCode: { contains: query.toUpperCase() } },
            ],
          }
        : {}),
    },
    include: {
      referralLink: { select: { name: true, code: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Foydalanuvchilar</h1>

      <LiveSearch placeholder="Ism, familiya, login, ID, email yoki hisob kodi" />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Foydalanuvchi</th>
              <th className="px-4 py-2">Rol</th>
              <th className="px-4 py-2">Manba</th>
              <th className="px-4 py-2">Balans</th>
              <th className="px-4 py-2">Holat</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => {
              const banned = u.bannedUntil && u.bannedUntil.getTime() > Date.now();
              const label = u.name ?? (u.login ? `@${u.login}` : u.id);
              return (
                <tr key={u.id} className="border-t border-white/5">
                  <td className="px-4 py-2">
                    <Link
                      href={`/sardorxon/admin/users/${u.id}`}
                      className="text-indigo-400 hover:underline"
                    >
                      {u.name ?? "—"}{" "}
                      <span className="text-zinc-500">@{u.login ?? "—"}</span>
                    </Link>
                    {!u.telegramChatId && u.telegramBlockedAt && (
                      <span
                        className="ml-1.5 text-amber-400"
                        title={`Telegram botni bloklagan · ${shortDateTime(u.telegramBlockedAt)}`}
                      >
                        🚫
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-zinc-400">
                    {u.role === "PREPARER"
                      ? "Tayyorlovchi"
                      : u.role === "ORDERER"
                        ? "Buyurtmachi"
                        : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex flex-col gap-0.5 text-xs">
                      {u.hearAboutUs && (
                        <span className="text-zinc-300">
                          {CHANNEL_ICONS[u.hearAboutUs] ?? "💬"}{" "}
                          {HEAR_ABOUT_US_LABELS[u.hearAboutUs] ?? u.hearAboutUs}
                        </span>
                      )}
                      {u.referralLink && (
                        <span className="text-emerald-400">
                          🔗 {u.referralLink.name}
                        </span>
                      )}
                      {!u.hearAboutUs && !u.referralLink && (
                        <span className="text-zinc-600">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-white">{formatSom(u.balance)}</td>
                  <td className="px-4 py-2">
                    {banned ? (
                      <span className="text-amber-400">cheklangan</span>
                    ) : (
                      <span className="text-emerald-400">faol</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <AdminPostButton
                      url={`/api/admin/users/${u.id}`}
                      method="DELETE"
                      label="O'chirish"
                      className="rounded-lg bg-red-500/15 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/25"
                      confirmText={`«${label}» hisobi va uning BARCHA ma'lumotlari (buyurtmalar, xabarlar, hisob amallari) butunlay o'chiriladi. Bu amalni ortga qaytarib bo'lmaydi. Davom etilsinmi?`}
                    />
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-zinc-500">
                  Hech narsa topilmadi.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
