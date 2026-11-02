import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { orderedPair } from "@/lib/chat";
import { formatSom } from "@/lib/wallet";
import { ComplaintForm } from "@/components/admin/complaint-form";
import { shortDateTime, shortDate } from "@/lib/date";
import { Icon } from "@/components/icons";

function AccountCard({
  title,
  user,
}: {
  title: string;
  user: {
    id: string;
    name: string | null;
    login: string | null;
    email: string | null;
    role: string | null;
    balance: number;
    bannedUntil: Date | null;
  } | null;
}) {
  if (!user) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h3 className="text-sm font-semibold text-zinc-400">{title}</h3>
        <p className="mt-2 text-sm text-zinc-500">Foydalanuvchi o'chirilgan.</p>
      </div>
    );
  }
  const banned = user.bannedUntil && user.bannedUntil.getTime() > Date.now();
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-sm font-semibold text-zinc-400">{title}</h3>
      <div className="mt-2 font-medium text-white">
        {user.name ?? "—"}{" "}
        <span className="text-zinc-500">@{user.login ?? "—"}</span>
      </div>
      <dl className="mt-2 space-y-1 text-sm text-zinc-400">
        <div>Email: {user.email ?? "—"}</div>
        <div>
          Rol:{" "}
          {user.role === "PREPARER"
            ? "Tayyorlovchi"
            : user.role === "ORDERER"
              ? "Buyurtmachi"
              : "—"}
        </div>
        <div>Balans: {formatSom(user.balance)}</div>
        <div>
          Holat:{" "}
          {banned ? (
            <span className="text-amber-400">
              {shortDate(user.bannedUntil!)} gacha cheklangan
            </span>
          ) : (
            <span className="text-emerald-400">faol</span>
          )}
        </div>
      </dl>
      <Link
        href={`/users/${user.id}`}
        className="mt-3 inline-block text-sm text-indigo-400 hover:underline"
      >
        Hisobni ochish (ban / xabar / chatlar) →
      </Link>
    </div>
  );
}

export default async function AdminComplaintDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const c = await db.complaint.findUnique({
    where: { id },
    include: {
      reporter: {
        select: {
          id: true,
          name: true,
          login: true,
          email: true,
          role: true,
          balance: true,
          bannedUntil: true,
        },
      },
      suspect: {
        select: {
          id: true,
          name: true,
          login: true,
          email: true,
          role: true,
          balance: true,
          bannedUntil: true,
        },
      },
    },
  });
  if (!c) notFound();

  const order = c.orderId
    ? await db.order.findUnique({
        where: { id: c.orderId },
        select: { id: true, title: true },
      })
    : null;

  // shikoyatchi–gumondor yozishmasi
  let pairConvId: string | null = null;
  if (c.suspectId) {
    const [a, b] = orderedPair(c.reporterId, c.suspectId);
    const conv = await db.conversation.findUnique({
      where: { userAId_userBId: { userAId: a, userBId: b } },
      select: { id: true },
    });
    pairConvId = conv?.id ?? null;
  }

  // muayyan xabar ustidan shikoyat bo'lsa
  const reportedMsg = c.messageId
    ? await db.message.findUnique({
        where: { id: c.messageId },
        select: {
          id: true,
          body: true,
          fileName: true,
          deletedAt: true,
          createdAt: true,
          conversationId: true,
        },
      })
    : null;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/complaints"
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← Shikoyatlar
      </Link>

      <div>
        <h1 className="text-xl font-semibold text-white">Shikoyat</h1>
        <p className="text-sm text-zinc-500">
          {shortDateTime(c.createdAt)}
          {order && ` · buyurtma: ${order.title}`}
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-2 text-sm font-semibold text-zinc-400">Shikoyat matni</h2>
        <p className="whitespace-pre-wrap text-sm text-zinc-100">{c.body}</p>
      </div>

      {reportedMsg && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-500/5 p-5">
          <h2 className="mb-2 text-sm font-semibold text-amber-300">
            Shikoyat qilingan xabar
          </h2>
          <p className="text-xs text-zinc-500">
            {shortDateTime(reportedMsg.createdAt)}
            {reportedMsg.deletedAt && " · (keyinchalik o'chirilgan)"}
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-100">
            {reportedMsg.fileName && (
              <span className="mr-1 inline-flex items-center gap-1 text-zinc-300">
                <Icon name="paperclip" className="h-3.5 w-3.5" />
                {reportedMsg.fileName}
              </span>
            )}
            {reportedMsg.body}
          </p>
          <Link
            href={`/chats/${reportedMsg.conversationId}`}
            className="mt-2 inline-block text-sm text-indigo-400 hover:underline"
          >
            Yozishmani ko'rish →
          </Link>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <AccountCard title="Shikoyat qiluvchi" user={c.reporter} />
        <AccountCard title="Gumondor" user={c.suspect} />
      </div>

      <div className="flex flex-wrap gap-2">
        {pairConvId ? (
          <Link href={`/chats/${pairConvId}`} className="btn-ghost">
            <Icon name="messages" className="h-4 w-4" />
            Ularning yozishmasini ko'rish
          </Link>
        ) : (
          <span className="text-sm text-zinc-500">
            Shikoyatchi va gumondor o'rtasida yozishma yo'q.
          </span>
        )}
        <Link
          href={`/users/${c.reporterId}`}
          className="btn-ghost"
        >
          Shikoyatchi chatlari
        </Link>
        {c.suspectId && (
          <Link
            href={`/users/${c.suspectId}`}
            className="btn-ghost"
          >
            Gumondor chatlari
          </Link>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 font-semibold text-white">Ko'rib chiqish</h2>
        <ComplaintForm complaintId={c.id} status={c.status} note={c.adminNote} />
      </div>
    </div>
  );
}
