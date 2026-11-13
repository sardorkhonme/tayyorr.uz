import { redirect } from "next/navigation";

import { BackLink } from "@/components/back-link";

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
      {/* kompyuterda Qöllanma/Referal sidebar menyusida — «orqaga» kerak emas */}
      <BackLink
        fallback="/profile"
        className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-white lg:hidden"
      />
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Referal</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Döstlaringizni taklif qiling — har bir röyxatdan ötgan uçun
          1 <StarIcon className="h-3.5 w-3.5" /> olasiz.
        </p>
      </div>

      <ReferralLinkCard userId={me.id} />

      {/* ogohlantiriş: ilovada röyxatdan ötilsa referal yozilmaydi (ilova brauzer cookie sini körmaydi) */}
      <div role="note" className="flex gap-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-amber-400 text-sm font-extrabold text-zinc-900">!</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-amber-300">Referal faqat saytda röyxatdan ötilganda işlaydi</p>
          <p className="mt-1 text-[13px] leading-relaxed text-zinc-400">Döstingiz havolani oçib, öşa brauzerning özida röyxatdan ötişi kerak. Agar u havoladan kirib mobil ilovani yuklab olsa va ilovada röyxatdan ötsa — referal hisoblanmaydi.</p>
        </div>
      </div>

      <div>
        <h2 className="mb-3 px-1 text-base font-semibold text-white">
          Siz taklif qilganlar ({user.referredUsers.length})
        </h2>
        {user.referredUsers.length === 0 ? (
          <div className="card text-sm text-zinc-500">
            Hozirça heç kim havolangiz orqali röyxatdan ötmagan.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {user.referredUsers.map((r) => (
              <li
                key={r.id}
                className="card flex items-center justify-between gap-3"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm text-zinc-200">{r.name ?? "—"}</span>
                  <span className="block truncate text-xs text-zinc-500">@{r.login ?? "—"}</span>
                </span>
                <span className="flex shrink-0 items-center gap-3 text-xs text-zinc-500">
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
