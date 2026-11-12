"use client";

import { useEffect, useRef, useState } from "react";

import type { SmmAnn } from "@/lib/announcement";

// o'qish uchun vaqt: har belgiga ~55ms + 4s, [4s..18s]
const readMs = (t: string) => Math.min(18000, Math.max(4000, 4000 + t.replace(/\s/g, "").length * 55));

/** Admin e'lonlari (tayyorr.uz dagi banner bilan bir xil) — bir nechta bo'lsa navbatlashadi. */
export function AnnouncementCarousel({ items }: { items: SmmAnn[] }) {
  const [i, setI] = useState(0);
  const start = useRef<number | null>(null);
  const n = items.length;
  const a = n ? items[Math.min(i, n - 1)] : null;
  const dur = a ? readMs(`${a.title} ${a.body} ${a.buttonText ?? ""}`) : 0;

  useEffect(() => {
    if (n < 2) return;
    const t = setTimeout(() => setI((p) => (p + 1) % n), dur);
    return () => clearTimeout(t);
  }, [i, n, dur]);

  if (!a) return null;
  const go = (to: number) => setI((to + n) % n);
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
      className="animate-rise select-none overflow-hidden rounded-3xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-fuchsia-50 p-5 shadow-sm"
    >
      <div key={a.id} className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
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
            className="btn-primary w-full shrink-0 justify-center whitespace-nowrap sm:w-auto"
          >
            {a.buttonText}
          </a>
        )}
      </div>
      {n > 1 && (
        <div className="mt-3 flex items-center gap-1.5">
          {items.map((it, k) => (
            <button
              key={it.id}
              type="button"
              aria-label={`${k + 1}`}
              onClick={() => go(k)}
              className={`h-1 rounded-full transition-all ${k === i ? "w-6 bg-indigo-500" : "w-3 bg-indigo-200"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
