import Link from "next/link";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getSupportUserId } from "@/lib/support";
import { getT } from "@/lib/i18n-server";
import { BlockedIcon, Icon } from "@/components/icons";
import { LiveConvBadge } from "@/components/live-conv-badge";
import { shortDate } from "@/lib/date";
import { stripSource } from "@/lib/message-source";

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "hozir";
  if (s < 3600) return `${Math.floor(s / 60)} daq oldin`;
  if (s < 86400) return `${Math.floor(s / 3600)} soat oldin`;
  return shortDate(d);
}

export default async function MessagesPage() {
  const session = await auth();
  const me = session!.user.id;
  const t = await getT();

  const convs = await db.conversation.findMany({
    where: {
      hiddenFromUsersAt: null,
      deletedByUsersAt: null,
      OR: [{ userAId: me }, { userBId: me }],
    },
    orderBy: { lastMessageAt: "desc" },
    include: {
      userA: { select: { id: true, name: true, login: true, avatarUrl: true, image: true } },
      userB: { select: { id: true, name: true, login: true, avatarUrl: true, image: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const supportId = await getSupportUserId();

  const blockedMeRows = await db.block.findMany({
    where: { blockedId: me },
    select: { blockerId: true },
  });
  const blockedMeBy = new Set(blockedMeRows.map((r) => r.blockerId));

  const rows = await Promise.all(
    convs.map(async (c) => {
      const other = c.userAId === me ? c.userB : c.userA;
      const unread = await db.message.count({
        where: { conversationId: c.id, senderId: { not: me }, readAt: null },
      });
      return {
        c,
        other,
        unread,
        last: c.messages[0] ?? null,
        isSupport: other.id === supportId,
        blockedMe: blockedMeBy.has(other.id) && other.id !== supportId,
      };
    }),
  );

  // support suhbatini eng tepaga qadaymiz
  rows.sort((a, b) => {
    if (a.isSupport !== b.isSupport) return a.isSupport ? -1 : 1;
    return b.c.lastMessageAt.getTime() - a.c.lastMessageAt.getTime();
  });

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-semibold tracking-tight text-white">{t("msgs.title")}</h1>

      {rows.length === 0 ? (
        <div className="card text-sm text-zinc-500">{t("msgs.empty")}</div>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map(({ c, other, unread, last, isSupport, blockedMe }) => (
            <li key={c.id} className="blur-in">
              <Link
                href={`/messages/${c.id}`}
                className={`card flex items-center gap-3 py-3 transition hover:border-white/15 hover:bg-white/[0.06] ${
                  isSupport ? "border-indigo-400/30 bg-indigo-500/[0.06]" : ""
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-white/5 text-lg text-zinc-500">
                  {blockedMe ? (
                    <BlockedIcon className="h-5 w-5" />
                  ) : (other.avatarUrl ?? other.image) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={other.avatarUrl ?? other.image ?? ""}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : isSupport ? (
                    <Icon name="lifebuoy" className="h-6 w-6 text-indigo-300" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex min-w-0 items-center gap-1.5 truncate font-medium text-white">
                      {isSupport && <Icon name="pin" className="h-3.5 w-3.5 shrink-0 text-indigo-400" />}
                      {other.name ?? other.login ?? "Foydalanuvchi"}
                    </span>
                    {last && (
                      <span className="shrink-0 text-xs text-zinc-500">
                        {timeAgo(last.createdAt)}
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-zinc-400">
                      {last ? (
                        <>
                          {last.senderId === me ? "Siz: " : ""}
                          {stripSource(last.body) || (
                            <>
                              <Icon name="paperclip" className="mr-0.5 inline-block h-3.5 w-3.5 align-[-2px]" />
                              fayl
                            </>
                          )}
                        </>
                      ) : (
                        t("msgs.started")
                      )}
                    </span>
                    <LiveConvBadge convId={c.id} initial={unread} />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
