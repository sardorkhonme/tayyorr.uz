import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { toClientMessages } from "@/lib/chat-messages";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { AdminConversationView } from "@/components/admin/admin-conversation-view";
import { shortDateTime } from "@/lib/date";

export default async function AdminChatView({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const conv = await db.conversation.findUnique({
    where: { id },
    include: {
      userA: { select: { id: true, login: true, name: true, isSupport: true } },
      userB: { select: { id: true, login: true, name: true, isSupport: true } },
      order: { select: { id: true, title: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: {
          revisions: { orderBy: { createdAt: "asc" } },
          reactions: true,
        },
      },
    },
  });
  if (!conv) notFound();

  const label = (u: {
    id: string;
    login: string | null;
    name: string | null;
    isSupport: boolean;
  }) => (u.isSupport ? "tayyorr.uz support" : `@${u.login ?? u.name ?? u.id}`);

  // o'ng tomon = userB perspektivasi
  const clientMsgs = await toClientMessages(conv.messages, conv.userB.id, {
    forAdmin: true,
  });
  const revisions: Record<string, string[]> = {};
  for (const m of conv.messages) {
    if (m.revisions.length) revisions[m.id] = m.revisions.map((r) => r.body);
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-5">
      <Link href="/chats" className="text-sm text-zinc-500 hover:text-white">
        ← Suhbatlar
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-white">
            {label(conv.userA)} ↔ {label(conv.userB)}
          </h1>
          <p className="text-sm text-zinc-500">
            <Link
              href={`/users/${conv.userA.id}`}
              className="text-indigo-400 hover:underline"
            >
              {label(conv.userA)}
            </Link>{" "}
            ·{" "}
            <Link
              href={`/users/${conv.userB.id}`}
              className="text-indigo-400 hover:underline"
            >
              {label(conv.userB)}
            </Link>
            {conv.order && ` · buyurtma: ${conv.order.title}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminPostButton
            url={`/api/admin/chats/${conv.id}/hide`}
            label={
              conv.hiddenFromUsersAt
                ? "Foydalanuvchilarga qaytarish"
                : "Foydalanuvchilardan yashirish"
            }
            className="btn-ghost"
          />
          <AdminPostButton
            url={`/api/admin/chats/${conv.id}`}
            method="DELETE"
            label="Suhbatni o'chirish"
            className="rounded-xl bg-red-500/15 px-4 py-2 text-sm text-red-300 hover:bg-red-500/25"
            confirmText="Suhbat va barcha xabarlar butunlay o'chiriladi. Davom etilsinmi?"
            redirectTo="/chats"
          />
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Faqat ko'rish uchun — bu yozishmaga javob yoza olmaysiz.
      </p>

      {conv.hiddenFromUsersAt && (
        <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-3 text-sm text-amber-200">
          Bu suhbat {shortDateTime(conv.hiddenFromUsersAt)} da yashirilgan —
          foydalanuvchilar ko'rmaydi, lekin bazada saqlanmoqda.
        </p>
      )}

      <AdminConversationView
        conversationId={conv.id}
        left={{ id: conv.userA.id, label: label(conv.userA) }}
        right={{ id: conv.userB.id, label: label(conv.userB) }}
        messages={clientMsgs}
        revisions={revisions}
      />
    </div>
  );
}
