import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDate } from "@/lib/date";

export default async function AdminUserReferrals({
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
      referredBy: { select: { id: true, login: true, name: true } },
      referredUsers: {
        select: { id: true, login: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user || user.isSupport) notFound();

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <h2 className="mb-3 font-semibold text-white">Referallar</h2>
      <div className="flex flex-col gap-3 text-sm">
        <div>
          <div className="mb-1 text-xs text-zinc-500">Kim taklif qilgan</div>
          {user.referredBy ? (
            <Link
              href={`/users/${user.referredBy.id}`}
              className="text-indigo-400 hover:underline"
            >
              {user.referredBy.name ?? "—"}{" "}
              <span className="text-zinc-500">@{user.referredBy.login ?? "—"}</span>
            </Link>
          ) : (
            <span className="text-zinc-500">—</span>
          )}
        </div>
        <div>
          <div className="mb-1 text-xs text-zinc-500">
            Kimlarni taklif qilgan ({user.referredUsers.length})
          </div>
          {user.referredUsers.length === 0 ? (
            <span className="text-zinc-500">—</span>
          ) : (
            <ul className="flex flex-col gap-1">
              {user.referredUsers.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/users/${r.id}`}
                    className="text-indigo-400 hover:underline"
                  >
                    {r.name ?? "—"} <span className="text-zinc-500">@{r.login ?? "—"}</span>
                  </Link>{" "}
                  <span className="text-xs text-zinc-600">· {shortDate(r.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
