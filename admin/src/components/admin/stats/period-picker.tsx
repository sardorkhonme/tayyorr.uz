"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const PRESETS = [
  { key: "1", label: "1 kun" },
  { key: "7", label: "7 kun" },
  { key: "30", label: "30 kun" },
  { key: "90", label: "90 kun" },
  { key: "365", label: "1 yil" },
  { key: "all", label: "Hammasi" },
];

/** Davr parametrlari — sahifaning boshqa parametrlari (masalan ?day=, ?t=) saqlanadi, sahifalash (lim) tozalanadi. */
const PERIOD_KEYS = ["r", "from", "to", "lim"];

/**
 * Statistika / Moliya davri: tayyor tugmalar (1 kun … Hammasi) va aniq sana(lar).
 * "1 kun" — bitta sana; qolganlari — "dan" va "gacha" (o'zgartirilsa — aniq oraliq).
 */
export function PeriodPicker({ active, fromDay, toDay, today }: { active: string; fromDay: string; toDay: string; today: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function go(next: Record<string, string>) {
    const p = new URLSearchParams(params.toString());
    for (const k of PERIOD_KEYS) p.delete(k);
    for (const [k, v] of Object.entries(next)) p.set(k, v);
    start(() => router.replace(`${pathname}?${p.toString()}`, { scroll: false }));
  }

  const single = active === "1";
  const dateCls = "input h-9 rounded-lg px-2.5 text-sm outline-none";
  const dateStyle = { width: "9.5rem", border: "1px solid var(--viz-grid)", background: "var(--viz-surface)", color: "var(--viz-text)", colorScheme: "inherit" } as const;

  return (
    <div className={`flex flex-col items-stretch gap-2 sm:items-end ${pending ? "opacity-60" : ""}`}>
      <nav className="viz-card inline-flex flex-wrap rounded-xl p-1 text-sm">
        {PRESETS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => go(x.key === "1" ? { r: "1", from: today } : { r: x.key })}
            className="rounded-lg px-3 py-1.5 font-medium transition"
            style={x.key === active ? { background: "var(--viz-1)", color: "#fff" } : { color: "var(--viz-muted)" }}
          >
            {x.label}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--viz-muted)" }}>
        {single ? (
          <>
            Sana
            <input type="date" value={fromDay} max={today} onChange={(e) => e.target.value && go({ r: "1", from: e.target.value })} className={dateCls} style={dateStyle} />
          </>
        ) : (
          <>
            <input
              type="date"
              value={fromDay}
              max={toDay}
              onChange={(e) => e.target.value && go({ from: e.target.value, to: toDay })}
              className={dateCls}
              style={dateStyle}
              aria-label="Boşlaniş sanasi"
            />
            dan
            <input
              type="date"
              value={toDay}
              min={fromDay}
              max={today}
              onChange={(e) => e.target.value && go({ from: fromDay, to: e.target.value })}
              className={dateCls}
              style={dateStyle}
              aria-label="Tugaş sanasi"
            />
            gaça
          </>
        )}
      </div>
    </div>
  );
}
