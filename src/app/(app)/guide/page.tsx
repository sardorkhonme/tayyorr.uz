import Link from "next/link";

import { BackLink } from "@/components/back-link";

import { auth } from "@/auth";
import { Icon } from "@/components/icons";
import { GuideVideoCard } from "@/components/guide-video-card";
import { getStarPrice, getMinOfferStars } from "@/lib/stars";
import { GUIDE_ROLES, ROLE_TITLE, getGuideVideos, guideSteps, type GuideRole } from "@/lib/guide";

export const dynamic = "force-dynamic";

const ROLE_ICON = { ORDERER: "package", PREPARER: "sparkles" } as const;
const ROLE_LEAD: Record<GuideRole, string> = {
  ORDERER: "Buyurtma beriş, köngilli tanlaş, şartnoma tuziş va işni qabul qiliş — boşidan oxirigaça.",
  PREPARER: "Star oliş, ariza yuboriş, şartnoma böyiça işlaş va pulni kartaga yeçib oliş — boşidan oxirigaça.",
};

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

  const [videos, starPrice, minOfferStars] = await Promise.all([
    getGuideVideos(role),
    getStarPrice(),
    getMinOfferStars(),
  ]);
  const steps = guideSteps(role, { starPrice, minOfferStars });
  const minutes = Math.max(2, Math.round(steps.reduce((n, s) => n + s.points.join(" ").split(" ").length, 0) / 160));

  return (
    <div className="flex flex-col gap-6">
      {/* kompyuterda Qöllanma/Referal sidebar menyusida — «orqaga» kerak emas */}
      <BackLink
        fallback="/profile"
        className="inline-flex w-fit items-center gap-1 text-sm text-zinc-500 hover:text-white lg:hidden"
      />
      {/* ——— hero ——— */}
      <section className="card">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300">
            <Icon name="help" className="h-3.5 w-3.5" />
            Qöllanma
          </span>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Tayyorr'dan qanday foydalaniladi
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">{ROLE_LEAD[role]}</p>

          {/* rol tanlash */}
          <div className="mt-5 inline-flex w-full gap-1 rounded-2xl border border-white/10 bg-white/[0.04] p-1 sm:w-auto">
            {GUIDE_ROLES.map((r) => {
              const on = r === role;
              return (
                <Link
                  key={r}
                  href={r === myRole ? "/guide" : `/guide?role=${r}`}
                  scroll={false}
                  aria-current={on ? "page" : undefined}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition sm:flex-none ${
                    on
                      ? "bg-indigo-500 shadow-lg shadow-indigo-500/25"
                      : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                  style={on ? { color: "#fff" } : undefined}
                >
                  <Icon name={ROLE_ICON[r]} className="h-4 w-4" />
                  {ROLE_TITLE[r]}
                  {r === myRole && (
                    <span
                      className={`rounded-full px-1.5 py-px text-[10px] font-semibold ${on ? "bg-white/20" : "bg-white/[0.08]"}`}
                    >
                      siz
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Icon name="check-circle" className="h-3.5 w-3.5 text-emerald-400" />
              {steps.length} ta qadam
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon name="clock" className="h-3.5 w-3.5 text-indigo-300" />~{minutes} daqiqa öqiş
            </span>
            {videos.length > 0 && (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="play" className="h-3.5 w-3.5 text-violet-300" />
                {videos.length} ta video
              </span>
            )}
          </div>
        </div>
      </section>

      {/* ——— videolarga olib boruvchi banner (videolar sahifaning eng ostida) ——— */}
      {videos.length > 0 && (
        <a
          href="#videos"
          className="card blur-in group flex items-center gap-4 border-indigo-400/25 transition hover:border-indigo-400/50"
        >
          <span className="flex w-full items-center gap-4">
            <span
              className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500 transition group-hover:scale-105"
              style={{ color: "#fff" }}
            >
              <span className="absolute inset-0 animate-ping rounded-2xl bg-indigo-500/30 [animation-duration:2.4s]" />
              <Icon name="play" className="relative h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold text-white">Körib örganişni afzal körasizmi?</span>
              <span className="mt-0.5 block text-sm text-zinc-400">
                {videos.length} ta video qöllanma tayyor — hammasi sahifaning pastida.
              </span>
            </span>
            <span className="btn-primary hidden shrink-0 sm:inline-flex">
              Videolarni köriş
              <span aria-hidden className="transition group-hover:translate-y-0.5">↓</span>
            </span>
            <span aria-hidden className="text-lg text-indigo-300 sm:hidden">↓</span>
          </span>
        </a>
      )}

      {/* ——— qadamlar (vertikal yo'l) ——— */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-white">Qadamma-qadam</h2>
        <ol className="relative">
          {steps.map((s, i) => {
            const last = i === steps.length - 1;
            return (
              <li key={s.title} className="blur-in relative flex gap-4 pb-4 last:pb-0 sm:gap-5">
                {/* raqam + ulovchi chiziq */}
                <div className="relative flex w-10 shrink-0 justify-center">
                  {!last && (
                    <span
                      aria-hidden
                      className="absolute left-1/2 top-11 -bottom-1 w-px -translate-x-1/2 bg-indigo-400/30"
                    />
                  )}
                  <span
                    className="relative z-[1] flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-sm font-semibold ring-4 ring-[var(--bg)]"
                    style={{ color: "#fff" }}
                  >
                    {i + 1}
                  </span>
                </div>

                <div className="group card min-w-0 flex-1 transition hover:border-indigo-400/30">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300 transition group-hover:scale-105">
                      <Icon name={s.icon} className="h-[18px] w-[18px]" />
                    </span>
                    <h3 className="font-semibold text-white">{s.title}</h3>
                  </div>
                  <ul className="mt-3 flex flex-col gap-2 text-sm leading-relaxed text-zinc-300">
                    {s.points.map((p) => (
                      <li key={p} className="flex gap-2.5">
                        <Icon name="check" className="mt-[3px] h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                  {s.link && role === myRole && (
                    <Link
                      href={s.link.href}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-indigo-400/25 bg-indigo-500/10 px-3 py-1.5 text-sm font-medium text-indigo-300 transition hover:bg-indigo-500/20"
                    >
                      {s.link.label}
                      <span aria-hidden>→</span>
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ——— yordam ——— */}
      <section className="card blur-in">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-300">
            <Icon name="headset" className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-white">Savolingiz qoldimi?</p>
            <p className="mt-0.5 text-sm text-zinc-400">Support jamoasi çatda javob beradi — istalgan savol böyiça yozing.</p>
          </div>
          <Link href="/messages" className="btn-primary shrink-0">
            <Icon name="message" className="h-4 w-4" />
            Support çatiga yoziş
          </Link>
        </div>
      </section>

      {/* ——— video qo'llanmalar (eng ostida) ——— */}
      {videos.length > 0 && (
        <section id="videos" className="scroll-mt-24">
          <div className="mb-4 flex items-center gap-2">
            <h2 className="text-lg font-semibold text-white">Video qöllanmalar</h2>
            <span className="rounded-full bg-indigo-500/15 px-2 py-0.5 text-xs font-semibold text-indigo-300">{videos.length}</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {videos.map((v, i) => (
              <GuideVideoCard key={v.id} video={v} index={i} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
