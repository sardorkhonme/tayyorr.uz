import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getSupportUserId } from "@/lib/support";
import { toClientMessages } from "@/lib/chat-messages";
import { listConversations } from "@/lib/conversations";
import { ChatRoom } from "@/components/chat-room";
import { ChatContactsRail } from "@/components/chat-contacts-rail";

/**
 * Admin — "tayyorr.uz support" nomidan yozishma. Oddiy foydalanuvchi chati
 * bilan aynan bir xil komponent (ovozli xabar, fayl ko'rish, ✓✓, javob,
 * reaksiya, real vaqt), faqat support rejimida.
 */
export default async function AdminMessageThread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supportId = await getSupportUserId();

  const conv = await db.conversation.findUnique({ where: { id } });
  if (!conv) notFound();
  if (conv.userAId !== supportId && conv.userBId !== supportId) notFound();
  const otherId = conv.userAId === supportId ? conv.userBId : conv.userAId;

  const [other, messages, rows] = await Promise.all([
    db.user.findUnique({
      where: { id: otherId },
      select: { id: true, name: true, login: true, avatarUrl: true, image: true, lastSeenAt: true },
    }),
    db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: "asc" },
      take: 300,
      include: { reactions: true },
    }),
    listConversations(supportId, { asSupport: true }),
  ]);

  return (
    <>
      <ChatContactsRail rows={rows} base="/sardorxon/admin/messages" asSupport />
      <ChatRoom
        conversationId={id}
        meId={supportId}
        orderId={conv.orderId}
        asSupport
        other={{
          id: other?.id ?? "",
          name: other?.name ?? other?.login ?? "Foydalanuvchi",
          login: other?.login ?? null,
          image: other?.avatarUrl ?? other?.image ?? null,
          isSupport: false,
          lastSeenAt: other?.lastSeenAt?.toISOString() ?? null,
        }}
        initialMessages={await toClientMessages(messages, supportId)}
      />
    </>
  );
}
