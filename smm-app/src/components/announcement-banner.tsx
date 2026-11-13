"use client";

import { useEffect, useRef, useState } from "react";

import type { SmmAnn } from "@/lib/announcement";

const CSS = `
@keyframes ann-in-r { from { opacity: 0; transform: translateX(28px) } to { opacity: 1; transform: none } }
@keyframes ann-in-l { from { opacity: 0; transform: translateX(-28px) } to { opacity: 1; transform: none } }
@keyframes ann-sheen { 0% { transform: translateX(-120%) skewX(-18deg) } 60%,100% { transform: translateX(320%) skewX(-18deg) } }
@keyframes ann-drift { 0%,100% { background-position: 0% 50% } 50% { background-position: 100% 50% } }
@keyframes ann-fill { from { width: 0 } to { width: 100% } }
@keyframes ann-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-3px) } }
.ann-box { background: linear-gradient(120deg, var(--ann-a), var(--ann-b), var(--ann-a)); background-size: 220% 100%; animation: ann-drift 9s ease-in-out infinite; }
.ann-in-r { animation: ann-in-r .5s cubic-bezier(.2,.8,.2,1) both } .ann-in-l { animation: ann-in-l .5s cubic-bezier(.2,.8,.2,1) both }
.ann-sheen { position: absolute; inset: 0 auto 0 0; width: 35%; pointer-events: none; background: linear-gradient(90deg, transparent, rgba(255,255,255,.3), transparent); animation: ann-sheen 4.5s ease-in-out infinite; }
.ann-btn { animation: ann-float 3s ease-in-out infinite }
@media (prefers-reduced-motion: reduce) { .ann-box, .ann-in-r, .ann-in-l, .ann-sheen, .ann-btn { animation: none } }
`;

// o'qish uchun vaqt: har belgiga ~55ms + 4s, [4s..18s]
const readMs = (t: string) => Math.min(18000, Math.max(4000, 4000 + t.replace(/\s/g, "").length * 55));

/** Admin e'lonlari (tayyorr.uz dagi banner bilan bir xil) — bir nechta bo'lsa navbatlashadi. */
export function AnnouncementCarousel({ items }: { items: SmmAnn[] }) {
  const [i, setI] = useState(0);
  const [dir, setDir] = useState<"r" | "l">("r");
  const start = useRef<number | null>(null);
  const n = items.length;
  const a = n ? items[Math.min(i, n - 1)] : null;
  const dur = a ? readMs(`${a.title} ${a.body} ${a.buttonText ?? ""}`) : 0;

  useEffect(() => {
    if (n < 2) return;
    const t = setTimeout(() => {
      setDir("r");
      setI((p) => (p + 1) % n);
    }, dur);
    return () => clearTimeout(t);
  }, [i, n, dur]);

  if (!a) return null;
  const go = (to: number) => {
    setDir(to < i ? "l" : "r");
    setI((to + n) % n);
  };
  const external = !!a.buttonUrl && /^https?:\/\//i.test(a.buttonUrl);

  return (
    <div
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        const s = start.current;
        start.current = null;
        if (n < 2 || s === null || Math.abs(e.clientX - s) < 40) return;
        go(e.clientX < s ? i + 1 : i - 1);
      }}
      style={{ touchAction: "pan-y" }}
      className="ann-box animate-rise relative select-none overflow-hidden rounded-3xl border border-indigo-200 p-5 shadow-sm [--ann-a:var(--color-indigo-50)] [--ann-b:var(--color-violet-100)]"
    >
      <style>{CSS}</style>
      <span aria-hidden className="ann-sheen" />
      <div key={a.id} className={`${dir === "r" ? "ann-in-r" : "ann-in-l"} relative flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5`}>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold text-zinc-900">{a.title}</p>
          {a.body && <p className="mt-1 max-w-2xl whitespace-pre-line text-sm leading-snug text-zinc-600">{a.body}</p>}
        </div>
        {a.buttonText && a.buttonUrl && (
          <a
            href={a.buttonUrl}
            onClick={() => {
              fetch(`/api/announcement/${a.id}/click`, { method: "POST", keepalive: true }).catch(() => {});
            }}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="ann-btn btn-primary w-full shrink-0 justify-center whitespace-nowrap sm:w-auto"
          >
            {a.buttonText}
          </a>
        )}
      </div>
      {n > 1 && (
        <div className="relative mt-3 flex items-center gap-1.5">
          {items.map((it, k) => (
            <button
              key={it.id}
              type="button"
              aria-label={`${k + 1}`}
              onClick={() => go(k)}
              className={`relative h-1 overflow-hidden rounded-full transition-all ${k === i ? "w-8 bg-indigo-200" : "w-3 bg-indigo-200"}`}
            >
              {/* faol nuqta — e'lon vaqti bilan töladi */}
              {k === i && (
                <span
                  key={`${a.id}-${i}`}
                  className="absolute inset-y-0 left-0 rounded-full bg-indigo-500"
                  style={{ animation: `ann-fill ${dur}ms linear both` }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
