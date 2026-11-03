import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { Icon } from "@/components/icons";

export default async function AdminUserTelegram({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      isSupport: true,
      telegramChatId: true,
      telegramUsername: true,
      telegramLinkedAt: true,
      telegramBlockedAt: true,
    },
  });
  if (!user || user.isSupport) notFound();

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">Telegram bot</h2>
      {user.telegramChatId ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-emerald-300">
            <Icon name="check-circle" className="mr-1 inline-block h-4 w-4 align-[-3px]" />
            Ulangan
            {user.telegramUsername ? ` — @${user.telegramUsername}` : ""}
            {user.telegramLinkedAt ? ` · ${shortDateTime(user.telegramLinkedAt)}` : ""}
          </p>
          <AdminPostButton
            url={`/api/admin/users/${user.id}/telegram-unlink`}
            label="Ulanişni uziş"
            confirmText="Telegram bot ulanişi uzilsinmi?"
            className="rounded-full bg-red-500/15 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/25"
          />
        </div>
      ) : user.telegramBlockedAt ? (
        <p className="text-sm text-amber-300">
          <Icon name="ban" className="mr-1 inline-block h-4 w-4 align-[-3px]" />
          Botni bloklagan
          {user.telegramUsername ? ` — @${user.telegramUsername}` : ""}
          {" · "}
          {shortDateTime(user.telegramBlockedAt)}
        </p>
      ) : (
        <p className="text-sm text-zinc-500">Ulanmagan</p>
      )}
    </section>
  );
}
