/**
 * Hero fon videosi — matn ortida, ekran chetidan boshlanib markazga qarab fon rangiga singib ketadi.
 * Ustida qorong'i qatlam: sarlavha har doim o'qiladi.
 */
export function HeroBgVideo({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <div aria-hidden className="hero-video-mask pointer-events-none absolute left-0 top-0 h-[46rem] w-full overflow-hidden sm:w-[80%] lg:h-[48rem] lg:w-[62%]">
      <video className="h-full w-full scale-105 object-cover blur-[5px]" src={url} autoPlay muted loop playsInline preload="metadata" />
      <div className="absolute inset-0 bg-[#06060b]/60" />
    </div>
  );
}
