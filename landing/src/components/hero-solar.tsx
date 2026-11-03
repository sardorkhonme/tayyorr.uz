/**
 * Hero vizuali — 3D "quyosh sistemasi": markazda tayyorr+ (quyosh), xizmatlar qiya (oval)
 * orbitalar bo'ylab aylanadi. Orbita tekisligi rotateX bilan yotqizilgan, perspektiva tufayli
 * sayyora oldinga chiqqanda kattalashadi, orqaga o'tganda kichrayib quyosh ortiga yashirinadi.
 * Sayyoralar har doim kameraga qarab turadi (teskari aylanish). Faqat CSS (globals.css: .solar-*).
 */
type Planet = { mark: string; label: string; size: string; dur: string; delay: string };

const PLANETS: Planet[] = [
  { mark: "/logo-mark.png", label: "Ilmiy işlar", size: "64%", dur: "18s", delay: "-3s" },
  { mark: "/smm-mark.png", label: "Tayyorr SMM", size: "100%", dur: "26s", delay: "-17s" },
];

/** bezak — kichik yorug' "yo'ldoshlar" */
const MOONS = [
  { size: "82%", dur: "34s", delay: "-8s", color: "#38bdf8" },
  { size: "82%", dur: "34s", delay: "-25s", color: "#e879f9" },
  { size: "46%", dur: "12s", delay: "-6s", color: "#a78bfa" },
];

export function HeroSolar() {
  return (
    <div className="animate-rise relative mx-auto aspect-[6/5] w-full max-w-[34rem] sm:aspect-[5/4]" style={{ animationDelay: "160ms" }}>
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[60%] w-[60%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-500/25 blur-3xl" />

      <div className="solar-scene">
        <div className="solar-plane">
          {[...PLANETS.map((p) => p.size), ...MOONS.map((m) => m.size)]
            .filter((s, i, a) => a.indexOf(s) === i)
            .map((s) => (
              <div key={s} aria-hidden className="solar-ring" style={{ "--size": s } as React.CSSProperties} />
            ))}

          {MOONS.map((m, i) => (
            <div key={i} aria-hidden className="solar-orbit" style={{ "--size": m.size, "--dur": m.dur, "--delay": m.delay } as React.CSSProperties}>
              <div className="solar-body">
                <div className="solar-face">
                  <span
                    className="block h-3 w-3 rounded-full"
                    style={{ background: `radial-gradient(circle at 35% 30%, #fff, ${m.color} 55%, transparent 75%)`, boxShadow: `0 0 18px ${m.color}` }}
                  />
                </div>
              </div>
            </div>
          ))}

          {PLANETS.map((p) => (
            <div key={p.label} className="solar-orbit" style={{ "--size": p.size, "--dur": p.dur, "--delay": p.delay } as React.CSSProperties}>
              <div className="solar-body">
                <div className="solar-face">
                  <div className="glass flex items-center gap-2 whitespace-nowrap rounded-xl p-1.5 pr-2.5 shadow-xl shadow-black/40 sm:gap-2.5 sm:rounded-2xl sm:p-2 sm:pr-3.5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-white sm:h-11 sm:w-11 sm:rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.mark} alt="" className="h-6 w-6 object-contain sm:h-8 sm:w-8" />
                    </span>
                    <span className="text-xs font-semibold text-white sm:text-sm">{p.label}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* quyosh — tayyorr+ */}
          <div className="solar-sun">
            <span className="grid h-20 w-20 place-items-center rounded-[1.25rem] bg-white shadow-[0_0_60px_rgba(129,140,248,0.55)] sm:h-32 sm:w-32 sm:rounded-[1.75rem]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/plus-mark.png" alt="tayyorr+" className="h-14 w-14 object-contain sm:h-24 sm:w-24" />
            </span>
            <span className="mt-2 block text-center font-display text-sm font-bold text-white sm:mt-2.5 sm:text-lg">tayyorr+</span>
          </div>
        </div>
      </div>
    </div>
  );
}
