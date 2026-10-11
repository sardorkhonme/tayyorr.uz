import { db } from "@/lib/db";
import { getSupportUserId } from "@/lib/support";

export interface ConvRow {
  id: string;
  otherId: string;
  name: string;
  avatar: string | null;
  isSupport: boolean;
  blockedMe: boolean;
  unread: number;
  lastText: string;
  lastAt: string | null;
  lastMine: boolean;
}

/** Foydalanuvchining barcha suhbatlari — ro'yxat / kontaktlar uchun. */
export async function listConversations(
  meId: string,
  opts: { asSupport?: boolean } = {},
): Promise<ConvRow[]> {
  const [convs, supportId, blockedRows] = await Promise.all([
    db.conversation.findMany({
      where: {
        // admin (support) foydalanuvchi o'chirgan suhbatlarni ham ko'radi
        ...(opts.asSupport ? {} : { hiddenFromUsersAt: null, deletedByUsersAt: null }),
        OR: [{ userAId: meId }, { userBId: meId }],
      },
      orderBy: { lastMessageAt: "desc" },
      ...(opts.asSupport ? { take: 100 } : {}),
      include: {
        userA: {
          select: { id: true, name: true, login: true, avatarUrl: true, image: true },
        },
        userB: {
          select: { id: true, name: true, login: true, avatarUrl: true, image: true },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    getSupportUserId(),
    db.block.findMany({ where: { blockedId: meId }, select: { blockerId: true } }),
  ]);

  const blockedMeBy = new Set(blockedRows.map((r) => r.blockerId));

  const rows = await Promise.all(
    convs.map(async (c) => {
      const other = c.userAId === meId ? c.userB : c.userA;
      const isSupport = other.id === supportId;
      const unread = await db.message.count({
        where: { conversationId: c.id, senderId: { not: meId }, readAt: null },
      });
      const last = c.messages[0] ?? null;
      const blockedMe = blockedMeBy.has(other.id) && !isSupport;
      return {
        id: c.id,
        otherId: other.id,
        name: other.name ?? other.login ?? "Foydalanuvchi",
        avatar: blockedMe ? null : other.avatarUrl ?? other.image ?? null,
        isSupport,
        blockedMe,
        unread,
        lastText: last ? last.body || "📎 fayl" : "Suhbat boshlandi",
        lastAt: last ? last.createdAt.toISOString() : null,
        lastMine: last ? last.senderId === meId : false,
      } satisfies ConvRow;
    }),
  );

  rows.sort((a, b) => {
    if (a.isSupport !== b.isSupport) return a.isSupport ? -1 : 1;
    return (b.lastAt ?? "").localeCompare(a.lastAt ?? "");
  });

  return rows;
}
