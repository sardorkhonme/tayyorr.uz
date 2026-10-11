import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { getConversationForUser, otherUserId, blockState } from "@/lib/chat";
import { toClientMessages } from "@/lib/chat-messages";
import { listConversations } from "@/lib/conversations";
import { chatContractPins } from "@/lib/chat-pins";
import { ChatRoom } from "@/components/chat-room";
import { ChatContactsRail } from "@/components/chat-contacts-rail";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const me = session!.user.id;

  const conv = await getConversationForUser(id, me);
  if (!conv) notFound();

  const otherId = otherUserId(conv, me);

  const [other, messages, activeContracts] = await Promise.all([
    db.user.findUnique({
      where: { id: otherId },
      select: {
        id: true,
        name: true,
        login: true,
        avatarUrl: true,
        image: true,
        isSupport: true,
        lastSeenAt: true,
      },
    }),
    db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: 200,
      include: { reactions: true },
    }),
    chatContractPins(me, otherId),
  ]);

  const bs = other?.isSupport
    ? { iBlocked: false, blockedMe: false }
    : await blockState(me, otherUserId(conv, me));
  const hideOther = bs.blockedMe && !other?.isSupport;

  const convRows = await listConversations(me);

  return (
    <>
      <ChatContactsRail rows={convRows} />
      <ChatRoom
        conversationId={id}
        meId={me}
        orderId={conv.orderId}
        orders={activeContracts}
        blockedByMe={bs.iBlocked}
        blockedMe={bs.blockedMe}
        other={{
          id: other?.id ?? "",
          name: other?.name ?? other?.login ?? "Foydalanuvchi",
          login: other?.login ?? null,
          image: hideOther ? null : other?.avatarUrl ?? other?.image ?? null,
          isSupport: other?.isSupport ?? false,
          lastSeenAt:
            hideOther || !other?.lastSeenAt
              ? null
              : other.lastSeenAt.toISOString(),
        }}
        initialMessages={await toClientMessages(messages, me)}
      />
    </>
  );
}
