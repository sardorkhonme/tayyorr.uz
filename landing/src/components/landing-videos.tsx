import { VideoCard } from "@/components/video-card";
import type { LandingVideo } from "@/lib/landing-data";

/** 4 ta video — "bento" panjara: biri katta, ikkitasi kichik, biri keng. */
const BENTO_SPAN = ["sm:col-span-2 sm:row-span-2", "", "", "sm:col-span-2"];

export function LandingVideos({ videos }: { videos: LandingVideo[] }) {
  if (videos.length === 0) return null;
  return (
    <section id="videolar" className="relative z-10 mx-auto max-w-6xl scroll-mt-28 px-6 py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-300">Amaliyotda</p>
        <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-white sm:text-5xl">
          Platforma qanday işlaşini köring
        </h2>
        <p className="mt-4 text-zinc-400">Röyxatdan ötişdan tayyor işni qabul qilişgaça — bir neça qisqa video.</p>
      </div>
      <div className="mt-14 grid grid-cols-1 gap-4 sm:auto-rows-[11rem] sm:grid-cols-4 lg:auto-rows-[13rem]">
        {videos.slice(0, 4).map((v, i) => (
          <VideoCard key={v.id} video={v} spanClassName={BENTO_SPAN[i] ?? ""} />
        ))}
      </div>
    </section>
  );
}
