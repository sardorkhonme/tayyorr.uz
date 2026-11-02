import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";
import { ReferralLinkCard } from "@/components/referral-link-card";
import { shortDateTime } from "@/lib/date";
import { StarIcon } from "@/components/icons";

export default async function ReferralPage() {
  const session = await auth();
  const me = session!.user;
  if (me.role !== "PREPARER") redirect("/dashboard");

  const user = await db.user.findUnique({
    where: { id: me.id },
    select: {
      starBalance: true,
      referredUsers: {
        select: { id: true, login: true, name: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) return null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-white">Referal</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Do'stlaringizni taklif qiling — har bir ro'yxatdan o'tgan uchun
          1 <StarIcon className="h-3.5 w-3.5" /> olasiz.
        </p>
      </div>

      <ReferralLinkCard userId={me.id} />

      <div>
        <h2 className="mb-2 font-semibold text-white">
          Siz taklif qilganlar ({user.referredUsers.length})
        </h2>
        {user.referredUsers.length === 0 ? (
          <div className="card text-sm text-zinc-500">
            Hozircha hech kim havolangiz orqali ro'yxatdan o'tmagan.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.referredUsers.map((r) => (
              <li
                key={r.id}
                className="card flex items-center justify-between gap-3"
              >
                <span className="text-sm text-zinc-200">
                  {r.name ?? "—"}{" "}
                  <span className="text-zinc-500">@{r.login ?? "—"}</span>
                </span>
                <span className="flex items-center gap-3 text-xs text-zinc-500">
                  {shortDateTime(r.createdAt)}
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/15 px-2 py-0.5 font-semibold text-amber-300">
                    +1 <StarIcon className="h-3 w-3" />
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
