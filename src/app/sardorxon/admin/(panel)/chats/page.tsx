import Link from "next/link";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { cleanQuery, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";

export default async function AdminChats({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
  const convs = await db.conversation.findMany({
    where: q ? { OR: [{ userA: userSearchWhere(q) }, { userB: userSearchWhere(q) }] } : undefined,
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      userA: { select: { id: true, login: true, name: true, isSupport: true } },
      userB: { select: { id: true, login: true, name: true, isSupport: true } },
      _count: { select: { messages: true } },
    },
  });

  const name = (u: { login: string | null; name: string | null; isSupport: boolean }) =>
    u.isSupport ? "tayyorr.uz support" : `@${u.login ?? u.name ?? "—"}`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Barcha suhbatlar</h1>
      <LiveSearch placeholder="Ishtirokchi (ism, familiya, login, ID)" />

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-white/[0.03] text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2">Ishtirokchilar</th>
              <th className="px-4 py-2">Xabarlar</th>
              <th className="px-4 py-2">Oxirgi</th>
              <th className="px-4 py-2">Holat</th>
            </tr>
          </thead>
          <tbody>
            {convs.map((c) => (
              <tr key={c.id} className="border-t border-white/5">
                <td className="px-4 py-2">
                  <Link
                    href={`/sardorxon/admin/chats/${c.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {name(c.userA)} ↔ {name(c.userB)}
                  </Link>
                </td>
                <td className="px-4 py-2 text-zinc-400">{c._count.messages}</td>
                <td className="whitespace-nowrap px-4 py-2 text-zinc-400">
                  {shortDateTime(c.lastMessageAt)}
                </td>
                <td className="px-4 py-2">
                  {c.hiddenFromUsersAt ? (
                    <span className="text-amber-400">yashirilgan</span>
                  ) : (
                    <span className="text-emerald-400">ochiq</span>
                  )}
                </td>
              </tr>
            ))}
            {convs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-zinc-500">
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
