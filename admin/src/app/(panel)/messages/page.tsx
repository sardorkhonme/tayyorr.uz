import Link from "next/link";

import { db } from "@/lib/db";
import { getSupportUserId } from "@/lib/support";
import { cleanQuery, userSearchWhere } from "@/lib/admin-search";
import { LiveSearch } from "@/components/admin/live-search";
import { splitSource, stripSource } from "@/lib/message-source";
import { Icon } from "@/components/icons";

export default async function AdminMessages({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const q = cleanQuery((await searchParams).q);
  const supportId = await getSupportUserId();

  const convs = await db.conversation.findMany({
    where: q
      ? {
          OR: [
            { userAId: supportId, userB: userSearchWhere(q) },
            { userBId: supportId, userA: userSearchWhere(q) },
          ],
        }
      : { OR: [{ userAId: supportId }, { userBId: supportId }] },
    orderBy: { lastMessageAt: "desc" },
    take: 100,
    include: {
      userA: { select: { id: true, login: true, name: true, avatarUrl: true, image: true } },
      userB: { select: { id: true, login: true, name: true, avatarUrl: true, image: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  // qidiruvga mos, lekin hali support bilan yozishmagan foydalanuvchilar — yangi chat ochish uchun
  const withConv = new Set(convs.map((c) => (c.userAId === supportId ? c.userBId : c.userAId)));
  const fresh = q
    ? (
        await db.user.findMany({
          where: { AND: [userSearchWhere(q), { isSupport: false }] },
          select: { id: true, login: true, name: true, avatarUrl: true, image: true },
          take: 20,
        })
      ).filter((u) => !withConv.has(u.id))
    : [];

  const rows = await Promise.all(
    convs.map(async (c) => {
      const user = c.userAId === supportId ? c.userB : c.userA;
      // support hali javob bermagan foydalanuvchi xabarlari
      const waiting = await db.message.count({
        where: { conversationId: c.id, senderId: { not: supportId }, readAt: null },
      });
      return { c, user, waiting, last: c.messages[0] ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold text-white">Xabarlar (tayyorr.uz support)</h1>
      <p className="text-sm text-zinc-500">
        Foydalanuvchilar bilan yozishmalar. Javoblar «tayyorr.uz support» nomidan
        boradi.
      </p>
      <LiveSearch placeholder="Ism, familiya, login yoki foydalanuvchi ID" />

      {rows.length === 0 && fresh.length === 0 && (
        <p className="text-sm text-zinc-500">{q ? "Hech narsa topilmadi." : "Hozircha suhbat yo'q."}</p>
      )}

      {fresh.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Yangi suhbat boshlash</div>
          {fresh.map((u) => (
            <Link
              key={u.id}
              href={`/messages/new?user=${u.id}`}
              className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 p-3 transition hover:bg-white/[0.04]"
            >
              <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {(u.avatarUrl ?? u.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl ?? u.image ?? ""} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <span className="min-w-0 flex-1 truncate text-sm text-white">
                {u.name ?? "—"} <span className="text-zinc-500">@{u.login ?? "—"}</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-indigo-300">
                <Icon name="message" className="h-3.5 w-3.5" />
                Yozish
              </span>
            </Link>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {rows.map(({ c, user, waiting, last }) => (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 transition hover:bg-white/[0.06]"
            >
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                {(user.avatarUrl ?? user.image) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatarUrl ?? user.image ?? ""}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-white">
                    {user.name ?? "—"}{" "}
                    <span className="text-zinc-500">@{user.login ?? "—"}</span>
                  </span>
                  {waiting > 0 && (
                    <span className="shrink-0 rounded-full bg-indigo-500 px-2 py-0.5 text-xs font-semibold text-white">
                      {waiting} yangi
                    </span>
                  )}
                </div>
                <div className="truncate text-sm text-zinc-400">
                  {last ? (
                    <>
                      {last.senderId === supportId ? "Support: " : ""}
                      {splitSource(last.body).source === "tayyorr+" ? "[tayyorr+] " : splitSource(last.body).source === "smm" ? "[SMM] " : ""}
                      {stripSource(last.body) || (
                        <>
                          <Icon name="paperclip" className="mr-0.5 inline-block h-3.5 w-3.5 align-[-2px]" />
                          fayl
                        </>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
