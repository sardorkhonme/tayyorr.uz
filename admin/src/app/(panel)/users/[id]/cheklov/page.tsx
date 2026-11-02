import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDateTime } from "@/lib/date";
import { AdminPostButton } from "@/components/admin/admin-post-button";
import { BanForm } from "@/components/admin/ban-form";

export default async function AdminUserBan({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, isSupport: true, bannedUntil: true, banReason: true },
  });
  if (!user || user.isSupport) notFound();

  const banned = user.bannedUntil && user.bannedUntil.getTime() > Date.now();

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">Cheklov (ban)</h2>
      {banned ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-amber-300">
            {shortDateTime(user.bannedUntil!)} gacha cheklangan.
            {user.banReason ? ` Sabab: ${user.banReason}` : ""}
          </p>
          <AdminPostButton
            url={`/api/admin/users/${user.id}/unban`}
            label="Cheklovni olib tashlash"
            className="btn-primary w-fit"
          />
          <div className="border-t border-white/10 pt-3">
            <p className="mb-2 text-xs text-zinc-500">Muddatni yangilash:</p>
            <BanForm userId={user.id} />
          </div>
        </div>
      ) : (
        <BanForm userId={user.id} />
      )}
    </section>
  );
}
