import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { shortDate } from "@/lib/date";
import { UserDetailTabs } from "@/components/admin/user-detail-tabs";

export default async function AdminUserDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      login: true,
      avatarUrl: true,
      image: true,
      isSupport: true,
      bannedUntil: true,
    },
  });
  if (!user || user.isSupport) notFound();

  const banned = user.bannedUntil && user.bannedUntil.getTime() > Date.now();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/users" className="text-sm text-zinc-500 hover:text-white">
        ← Foydalanuvçilar
      </Link>

      <div className="flex items-center gap-4">
        <div className="h-14 w-14 overflow-hidden rounded-full border border-white/10 bg-white/5">
          {(user.avatarUrl ?? user.image) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatarUrl ?? user.image ?? ""}
              alt=""
              className="h-full w-full object-cover"
            />
          )}
        </div>
        <div>
          <h1 className="text-xl font-semibold text-white">
            {user.name ?? user.login}
          </h1>
          <p className="text-sm text-zinc-500">
            @{user.login}
            {banned && (
              <span className="ml-2 rounded bg-amber-500/15 px-1.5 py-0.5 text-xs text-amber-300">
                {shortDate(user.bannedUntil!)} gaça çeklangan
              </span>
            )}
          </p>
        </div>
      </div>

      <UserDetailTabs userId={id} />

      {children}
    </div>
  );
}
