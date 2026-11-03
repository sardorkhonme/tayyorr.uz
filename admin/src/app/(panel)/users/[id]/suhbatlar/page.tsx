import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";

export default async function AdminUserConversations({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true },
  });
  if (!user || user.isSupport) notFound();

  const convs = await db.conversation.findMany({
    where: { OR: [{ userAId: id }, { userBId: id }] },
    orderBy: { lastMessageAt: "desc" },
    take: 30,
    include: {
      userA: { select: { id: true, login: true, name: true, isSupport: true } },
      userB: { select: { id: true, login: true, name: true, isSupport: true } },
      _count: { select: { messages: true } },
    },
  });

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">Suhbatlar</h2>
      {convs.length === 0 ? (
        <p className="text-sm text-zinc-500">Suhbat yöq.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-sm">
          {convs.map((c) => {
            const other = c.userAId === id ? c.userB : c.userA;
            return (
              <li key={c.id}>
                <Link
                  href={`/chats/${c.id}`}
                  className="backdrop-blur-sm flex justify-between rounded-lg px-2 py-1.5 hover:bg-white/5"
                >
                  <span className="text-zinc-200">
                    {other.isSupport ? "tayyorr.uz support" : `@${other.login ?? other.name ?? "—"}`}
                    {c.hiddenFromUsersAt && (
                      <span className="ml-2 text-xs text-amber-400">yaşirilgan</span>
                    )}
                  </span>
                  <span className="text-zinc-500">{c._count.messages} xabar</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
