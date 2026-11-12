"use client";

import { useEffect, useState } from "react";

import { Icon, type IconName } from "@/components/icons";
import { THEME_COOKIE, type ThemeMode } from "@/lib/theme";

const OPTS: [ThemeMode, IconName, string][] = [
  ["light", "sun", "Yoruğ"],
  ["dark", "moon", "Qoronği"],
];

function apply(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  document.cookie = `${THEME_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((el) => el.setAttribute("content", mode === "dark" ? "#0c0c11" : "#f5f5f9"));
}

/**
 * Yorug'/qorong'i mavzu tanlagiçi — ikki bölakli kapsula, tanlangan tomonga oq "plitka" suriladi.
 * Almaşganda bosilgan joydan doira bölib yoyiladi (View Transitions; bölmasa — darhol).
 */
export function ThemeSwitcher() {
  const [mode, setMode] = useState<ThemeMode | null>(null);

  useEffect(() => {
    setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function pick(m: ThemeMode, e: React.MouseEvent<HTMLButtonElement>) {
    if (m === mode) return;
    setMode(m);
    const doc = document as Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };
    if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      apply(m);
      return;
    }
    const r = e.currentTarget.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    doc
      .startViewTransition(() => apply(m))
      .ready.then(() => {
        document.documentElement.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 600, easing: "cubic-bezier(0.65, 0, 0.35, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {});
  }

  const idx = mode === "dark" ? 1 : 0;

  return (
    <div role="radiogroup" aria-label="Mavzu" className="relative grid w-full grid-cols-2 rounded-2xl bg-zinc-100 p-1 sm:w-64">
      <span
        aria-hidden
        className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-white shadow-sm ring-1 ring-zinc-200 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          mode === null ? "opacity-0" : ""
        }`}
        style={{ transform: `translateX(${idx * 100}%)` }}
      />
      {OPTS.map(([m, icon, label]) => {
        const on = mode === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={(e) => pick(m, e)}
            className={`relative z-[1] flex h-10 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors ${
              on ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            <Icon name={icon} className={`h-[18px] w-[18px] ${on ? (m === "dark" ? "text-indigo-500" : "text-amber-500") : ""}`} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
