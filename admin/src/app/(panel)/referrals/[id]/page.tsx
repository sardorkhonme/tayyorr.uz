import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { referralUrl } from "@/lib/referral";
import { shortDate, shortDateTime } from "@/lib/date";
import { CopyLinkButton } from "@/components/admin/copy-link-button";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  PREPARER: "Tayyorlovchi",
  ORDERER: "Buyurtmachi",
};

export default async function AdminReferralDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const link = await db.referralLink.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          login: true,
          role: true,
          avatarUrl: true,
          image: true,
          createdAt: true,
        },
      },
    },
  });
  if (!link) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/referrals"
        className="text-sm text-zinc-500 hover:text-white"
      >
        ← Tashriflar
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-white">{link.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-xs text-zinc-500">
              /r/{link.code}
            </span>
            <CopyLinkButton url={referralUrl(link.code)} />
          </div>
        </div>
        <div className="flex gap-6 text-right">
          <div>
            <div className="text-2xl font-semibold text-white">
              {link.visits}
            </div>
            <div className="text-xs text-zinc-500">tashrif</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-emerald-400">
              {link.users.length}
            </div>
            <div className="text-xs text-zinc-500">ro'yxatdan o'tgan</div>
          </div>
        </div>
      </div>

      <p className="text-xs text-zinc-600">
        Yaratilgan: {shortDateTime(link.createdAt)}
      </p>

      <div>
        <h2 className="mb-3 font-semibold text-white">
          Ro'yxatdan o'tganlar ({link.users.length})
        </h2>
        {link.users.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-zinc-500">
            Bu havola orqali hali hech kim ro'yxatdan o'tmagan.
          </div>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {link.users.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/users/${u.id}`}
                  className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 transition hover:border-white/15 hover:bg-white/[0.06]"
                >
                  <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                    {(u.avatarUrl ?? u.image) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={u.avatarUrl ?? u.image ?? ""}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">
                      {u.name ?? "—"}{" "}
                      <span className="text-zinc-500">@{u.login ?? "—"}</span>
                    </span>
                    <span className="text-xs text-zinc-500">
                      {ROLE_LABEL[u.role ?? ""] ?? "—"} · {shortDate(u.createdAt)}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
