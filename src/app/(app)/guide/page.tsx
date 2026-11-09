import Link from "next/link";

import { auth } from "@/auth";
import { Icon } from "@/components/icons";
import { getStarPrice, getMinOfferStars } from "@/lib/stars";
import { GUIDE_ROLES, ROLE_TITLE, getGuideVideo, guideSteps, type GuideRole } from "@/lib/guide";

export const dynamic = "force-dynamic";

/** Qo'llanma: foydalanuvchi o'z roli bo'yicha qila oladigan ishlar ketma-ketligi + video. */
export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  const session = await auth();
  const myRole: GuideRole = session?.user.role === "PREPARER" ? "PREPARER" : "ORDERER";
  const asked = (await searchParams).role;
  const role: GuideRole = asked === "PREPARER" || asked === "ORDERER" ? asked : myRole;

  const [video, starPrice, minOfferStars] = await Promise.all([
    getGuideVideo(role),
    getStarPrice(),
    getMinOfferStars(),
  ]);
  const steps = guideSteps(role, { starPrice, minOfferStars });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-semibold text-white">Qöllanma</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Tayyorr'da nimalar qila olişingiz va qaysi ketma-ketlikda — qadamma-qadam.
        </p>
      </div>

      {/* rol tanlash — o'z rolingiz standart, ikkinchisini ham ko'rish mumkin */}
      <div className="flex flex-wrap gap-1.5">
        {GUIDE_ROLES.map((r) => (
          <Link
            key={r}
            href={r === myRole ? "/guide" : `/guide?role=${r}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium backdrop-blur-sm transition ${
              r === role
                ? "bg-indigo-500 text-white"
                : "bg-white/[0.05] text-zinc-400 hover:bg-white/10 hover:text-white"
            }`}
          >
            {ROLE_TITLE[r]}
            {r === myRole && <span className="ml-1 opacity-70">· siz</span>}
          </Link>
        ))}
      </div>

      {video ? (
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <video src={video} controls playsInline preload="metadata" className="max-h-[70vh] w-full bg-black" />
        </div>
      ) : (
        <div className="card flex items-center gap-3 text-sm text-zinc-500">
          <Icon name="film" className="h-5 w-5 shrink-0" />
          Video qöllanma tez orada qöşiladi. Hozirça quyidagi qadamlarni öqing.
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {steps.map((s, i) => (
          <li key={s.title} className="card flex gap-4">
            <div className="flex shrink-0 flex-col items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
                <Icon name={s.icon} className="h-4.5 w-4.5" />
              </span>
              <span className="text-xs font-semibold text-zinc-600">{i + 1}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-white">{s.title}</h2>
              <ul className="mt-1.5 flex flex-col gap-1 text-sm text-zinc-300">
                {s.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
              {s.link && role === myRole && (
                <Link
                  href={s.link.href}
                  className="mt-2.5 inline-flex items-center gap-1 text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
                >
                  {s.link.label} ›
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <p className="text-center text-sm text-zinc-500">
        Savolingiz qoldimi?{" "}
        <Link href="/messages" className="text-indigo-300 hover:text-indigo-200">
          Support çatiga yozing
        </Link>
      </p>
    </div>
  );
}
