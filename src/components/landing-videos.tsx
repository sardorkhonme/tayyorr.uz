import { VideoCard } from "@/components/video-card";

type VideoItem = { id: string; title: string; videoUrl: string };

/**
 * 4ta videoni oddiy teng katakli emas, "bento" uslubidagi nomutanosib
 * panjarada joylashtiradi: biri katta, ikkitasi kichik, biri keng.
 */
const BENTO_SPAN = [
  "sm:col-span-2 sm:row-span-2",
  "",
  "",
  "sm:col-span-2",
];

export function LandingVideos({ videos }: { videos: VideoItem[] }) {
  if (videos.length === 0) return null;

  return (
    <section id="videolar" className="relative z-10 mx-auto max-w-5xl px-6 py-20">
      <div className="blur-in mx-auto max-w-xl text-center">
        <div className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-400">
          Amaliyotda
        </div>
        <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Platforma qanday işlaşini köring
        </h2>
        <p className="mt-3 text-zinc-400">
          Röyxatdan ötişdan tayyor işni qabul qilişgaça — bir
          neça qisqa video.
        </p>
      </div>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-4 sm:auto-rows-[10rem] lg:auto-rows-[11rem]">
        {videos.slice(0, 4).map((v, i) => (
          <VideoCard key={v.id} video={v} spanClassName={BENTO_SPAN[i] ?? ""} />
        ))}
      </div>
    </section>
  );
}
