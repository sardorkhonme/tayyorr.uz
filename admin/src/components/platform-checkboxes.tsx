"use client";

import { PLATFORM_OPTIONS, platformsOf, sourceOf, type MessageSource, type Platform } from "@/lib/message-source";

/**
 * Xabar qaysi platformalarda ko'rinishi — checkbox'lar (bir nechtasini tanlash mumkin).
 * Kamida bittasi belgilangan bo'lishi shart: oxirgisini olib tashlab bo'lmaydi.
 */
export function PlatformCheckboxes({
  value,
  onChange,
  size = "sm",
}: {
  value: MessageSource;
  onChange: (v: MessageSource) => void;
  size?: "sm" | "md";
}) {
  const selected = platformsOf(value);
  const toggle = (p: Platform) => {
    const next = selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p];
    const src = sourceOf(next);
    if (src) onChange(src);
  };
  const all = selected.length === PLATFORM_OPTIONS.length;
  const pad = size === "md" ? "px-3 py-1.5" : "px-2.5 py-1";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PLATFORM_OPTIONS.map((o) => {
        const on = selected.includes(o.value);
        const last = on && selected.length === 1;
        return (
          <label
            key={o.value}
            title={last ? "Kamida bitta platforma tanlangan bölişi kerak" : undefined}
            className={`inline-flex cursor-pointer select-none items-center gap-1.5 rounded-lg border font-medium transition ${pad} ${
              on
                ? "border-indigo-400/60 bg-indigo-500/15 text-white"
                : "border-white/10 bg-white/[0.03] text-zinc-400 hover:text-white"
            } ${last ? "cursor-not-allowed" : ""}`}
          >
            <input
              type="checkbox"
              className="h-3.5 w-3.5 accent-indigo-500"
              checked={on}
              disabled={last}
              onChange={() => toggle(o.value)}
            />
            {o.label}
          </label>
        );
      })}
      <button
        type="button"
        onClick={() => onChange(all ? "tayyorr.uz" : "ikkalasi")}
        className={`rounded-lg font-medium text-zinc-500 transition hover:text-white ${pad}`}
      >
        {all ? "Tozalaş" : "Hammasi"}
      </button>
    </div>
  );
}
