"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

import { Icon } from "@/components/icons";

/** Kun tanlash: kalendar + oldingi/keyingi kun + "Bugun". URL ?day=YYYY-MM-DD (boshqa parametrlar saqlanadi). */
export function DayPicker({ day, today }: { day: string; today: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  function go(next: string) {
    const p = new URLSearchParams(params.toString());
    if (next === today) p.delete("day");
    else p.set("day", next);
    start(() => router.replace(`/stats?${p.toString()}#kunlik`, { scroll: false }));
  }
  const shift = (n: number) => {
    const d = new Date(`${day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  };
  const btn = "grid h-9 w-9 place-items-center rounded-lg transition disabled:opacity-30";

  return (
    <div className={`flex shrink-0 items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <button type="button" onClick={() => go(shift(-1))} aria-label="Oldingi kun" className={btn} style={{ border: "1px solid var(--viz-grid)", color: "var(--viz-text)" }}>
        <Icon name="arrow-up" className="h-4 w-4 -rotate-90" />
      </button>
      <input
        type="date"
        value={day}
        max={today}
        onChange={(e) => e.target.value && go(e.target.value)}
        className="input h-9 rounded-lg px-3 text-sm outline-none"
        style={{ border: "1px solid var(--viz-grid)", background: "var(--viz-surface)", color: "var(--viz-text)", colorScheme: "inherit" }}
      />
      <button type="button" onClick={() => go(shift(1))} disabled={day >= today} aria-label="Keyingi kun" className={btn} style={{ border: "1px solid var(--viz-grid)", color: "var(--viz-text)" }}>
        <Icon name="arrow-up" className="h-4 w-4 rotate-90" />
      </button>
      {day !== today && (
        <button type="button" onClick={() => go(today)} className="h-9 rounded-lg px-3 text-sm font-medium text-white" style={{ background: "var(--viz-1)" }}>
          Bugun
        </button>
      )}
    </div>
  );
}
