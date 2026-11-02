"use client";

import { useEffect, useState } from "react";

import { PlatformIcon } from "@/components/platform-icon";

const TARGET = { followers: 12_480, likes: 4_870, views: 38_400 };
const START = { followers: 1_248, likes: 340, views: 2_100 };

function fmt(n: number) {
  if (n >= 10_000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
  return n.toLocaleString("ru-RU");
}

/** Bosh sahifadagi jonli "o'sish" kartasi — raqamlar ko'z oldida o'sadi. */
export function GrowthMockup() {
  const [t, setT] = useState(0); // 0..1 animatsiya bosqichi
  const [extra, setExtra] = useState(0); // keyin har bir necha soniyada qo'shiladigan obunachilar
  const [tick, setTick] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setT(1);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const p = Math.min((now - t0) / 2200, 1);
      setT(1 - Math.pow(1 - p, 3));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const id = setInterval(() => {
      const n = 12 + Math.floor(Math.random() * 60);
      setExtra((v) => v + n);
      setTick(n);
    }, 2600);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(id);
    };
  }, []);

  const val = (k: keyof typeof TARGET) => Math.round(START[k] + (TARGET[k] - START[k]) * t);
  const followers = val("followers") + extra;

  return (
    <div className="relative mx-auto w-full max-w-[380px]">
      {/* suzuvchi bildirishnomalar */}
      <div className="animate-float absolute -left-10 bottom-16 z-10 hidden rounded-2xl border border-emerald-100 bg-white px-4 py-3 shadow-xl sm:block">
        <p className="text-xs text-zinc-500">Buyurtma bajarildi</p>
        <p className="font-display text-base font-semibold text-emerald-600">+5 000 obunachi ✓</p>
      </div>
      <div
        className="animate-float absolute -right-6 -top-7 z-10 hidden rounded-2xl border border-fuchsia-100 bg-white px-4 py-3 shadow-xl sm:block"
        style={{ animationDelay: "1.5s" }}
      >
        <p className="text-xs text-zinc-500">Reels ko&apos;rishlari</p>
        <p className="font-display text-base font-semibold text-fuchsia-600">+12 000 👁</p>
      </div>

      <div className="relative rounded-[2rem] border border-zinc-200/80 bg-white p-6 shadow-[0_30px_80px_-30px_rgba(79,70,229,0.45)]">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-amber-400 via-pink-500 to-violet-600 p-[2px]">
            <span className="grid h-full w-full place-items-center rounded-full bg-white font-display font-bold text-zinc-800">
              S
            </span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-zinc-900">@sizning_sahifangiz</p>
            <p className="text-xs text-zinc-500">Oxirgi 7 kun</p>
          </div>
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-white"
            style={{ background: "linear-gradient(135deg, #f58529, #dd2a7b)" }}
          >
            <PlatformIcon platform="instagram" className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Obunachi", value: followers, color: "text-indigo-600" },
            { label: "Layk", value: val("likes"), color: "text-pink-600" },
            { label: "Ko'rish", value: val("views"), color: "text-amber-600" },
          ].map((s) => (
            <div key={s.label} className="relative rounded-2xl bg-zinc-50 px-2 py-3">
              {s.label === "Obunachi" && tick !== null && (
                <span
                  key={extra}
                  className="animate-pop absolute -right-1 -top-2.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white shadow"
                >
                  +{tick}
                </span>
              )}
              <p className={`font-display text-xl font-bold tabular-nums ${s.color}`}>{fmt(s.value)}</p>
              <p className="mt-0.5 text-xs text-zinc-500">{s.label}</p>
            </div>
          ))}
        </div>

        {/* o'sish grafigi */}
        <svg viewBox="0 0 300 110" className="mt-6 h-28 w-full" aria-hidden>
          <defs>
            <linearGradient id="gm-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#818cf8" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#818cf8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="gm-line" x1="0" x2="1">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#d946ef" />
            </linearGradient>
            <clipPath id="gm-clip">
              <rect x="0" y="0" width={300 * t} height="110" />
            </clipPath>
          </defs>
          <g clipPath="url(#gm-clip)">
            <path
              d="M0 100 C 40 98, 60 92, 90 86 S 140 70, 170 58 S 230 30, 260 18 S 290 8, 300 6 L 300 110 L 0 110 Z"
              fill="url(#gm-fill)"
            />
            <path
              d="M0 100 C 40 98, 60 92, 90 86 S 140 70, 170 58 S 230 30, 260 18 S 290 8, 300 6"
              fill="none"
              stroke="url(#gm-line)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        </svg>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-emerald-50 px-4 py-3">
          <span className="text-sm font-medium text-emerald-700">O&apos;sish</span>
          <span className="font-display text-lg font-bold text-emerald-600">+{Math.round(900 * t)}%</span>
        </div>

      </div>
    </div>
  );
}
